const buildTrainingData = (node = {}, buildPromptWithDivs = false) => {
  if (!node) {
    return
  }

  const { nodeName, children, orientation = ORIENTATION.NOT_ALIGNED } = node

  let prompt
  let completion
  let trainingSet = []

  // If the node is not aligned, we go recursively through the children
  if (orientation === ORIENTATION.NOT_ALIGNED) {
    if (!children?.length || CONTENT_TAGS[nodeName]) {
      return null
    }

    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData(child, buildPromptWithDivs)
    })

    return trainingSet.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  // We override the top offset for elements so that we keep everything bellow 5000px
  // const topOffset = getTopOffset(node)
  const topOffset = 0

  prompt = buildPrompt({ node, topOffset, buildPromptWithDivs })
  prompt += ` ${GPT_END_OF_PROMPT}`

  completion = buildCompletion({ node, topOffset })
  completion = ` ${completion} ${GPT_END_OF_COMPLETION}`

  // If we have a prompt too short we don't include it, and we don't visit the children either
  if (prompt?.length < MIN_PROMPT_LENGTH || completion?.length < MIN_PROMPT_LENGTH) {
    return null
  }

  if (prompt.match(NEGATIVE_NR) && !completion.match(NEGATIVE_NR)) {
    console.log('NEGATIVE NR', prompt, completion)
    return null
  }

  // If the prompt is too long, we get the training data from the children
  if (prompt.length + completion.length > MAX_PROMPT_LENGTH) {
    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData(child, buildPromptWithDivs)
    })

    return trainingSet.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  return [{ prompt, completion }]
}

const buildPrompt = (props) => {
  const { node, topOffset, buildPromptWithDivs = false } = props
  const { nodeName, children, styles } = node

  const { elType, rectData } = getElTypeAndRectData(node, topOffset)

  markForTesting({ node })

  if (isAbsolutePosOrUnaligned(node)) {
    markForTesting({ node, hideElement: true })
    return NO_DATA
  }

  let result = `[${elType} ${rectData}]`

  // Divs that are not visibly distinguisable from the background, may be included in the prompt or not
  if (elType === DIV_LABELS.DIV && !stylesHaveVisibleBackgroundOrBorder(styles)) {
    const includeElement = buildPromptWithDivs && includeThisDivInPrompt()

    if (!includeElement) {
      result = NO_DATA
      markForTesting({ node, hideElement: true })
    }
  }

  if (!children?.length) {
    return result
  }

  if (CONTENT_TAGS[nodeName] && nodeName !== NODE_NAME.ANCHOR) {
    return result
  }

  children.forEach((child) => {
    result += buildPrompt({ ...props, node: child })
  })

  return result
}

const buildCompletion = (props) => {
  const { node, topOffset } = props
  const { nodeName, children } = node

  const { elType, rectData } = getElTypeAndRectData(node, topOffset)

  if (isAbsolutePosOrUnaligned(node)) {
    return NO_DATA
  }

  // TODO -> change to include the rect data for the divs
  // let result = `[${elType} ${rectData}`

  let result = elType === DIV_LABELS.DIV ? `[${elType}` : `[${elType} ${rectData}`

  // For any type of element that is a leaf, we include the rect data
  if (!children?.length) {
    return `${result}]`
  }

  if (CONTENT_TAGS[nodeName] && nodeName !== NODE_NAME.ANCHOR) {
    return `${result}]`
  }

  children.forEach((child) => {
    result += buildCompletion({ ...props, node: child })
  })

  return `${result}]`
}

const adjustScrollPosition = () => Math.random() <= SCROLL_ADJUSTMENT_PERCENTAGE
const includeThisDivInPrompt = () => Math.random() <= DIV_PERCENTAGE

const isAbsolutePosOrUnaligned = (node) => {
  const { children, orientation, styles, rect } = node
  const { top, width, height } = rect

  // If an el has orientation then it's a div, and if not aligned, we exclude it from the prompt
  if (orientation && orientation === ORIENTATION.NOT_ALIGNED) {
    return true
  }

  // For absolute positioned elements, we do some extra checks (missed when crawled data)
  if (styles?.position?.includes('absolute') || styles?.position?.includes('fixed')) {
    if (top > MAX_NAV_TOP) {
      return true
    }

    // Because the intention is to only include the nav bar, we exclude elements without children
    if (!children?.length) {
      return true
    }

    if (height > MAX_NAV_SIZE && width > MAX_NAV_SIZE) {
      return true
    }
  }
}

// In this version we don't take the orientation into account
const getElTypeAndRectData = (node, topOffset = 0) => {
  const { nodeName: tag, rect, children } = node
  const { top, left, width, height } = rect

  // const rectData = `x${left} y${top} w${width} h${height}`
  const rectData = `top${top - topOffset} left${left} width${width} height${height}`

  const elType = CONTAINER_TAGS[tag]
    ? children
      ? DIV_LABELS.DIV
      : DIV_LABELS.SLOT
    : CONTENT_TAG_LABEL[tag]

  return {
    elType,
    rectData,
  }
}

const enrichData = (trainingData = []) => {
  const enrichedData = []

  for (let i = 0; i < trainingData.length; i++) {
    let { prompt, completion } = trainingData[i]

    prompt = prompt.replace(
      TOP_COORDINATE_REGEX,
      (match, p1) => `top${getNewCoordinate(parseInt(p1))}`
    )
    prompt = prompt.replace(
      LEFT_COORDINATE_REGEX,
      (match, p1) => `left${getNewCoordinate(parseInt(p1))}`
    )

    enrichedData[i] = { prompt, completion }
  }

  return enrichedData
}

const getNewCoordinate = (coordinate) => {
  const delta = getRandomInt()
  return coordinate + delta < 0 ? 0 : coordinate + delta
}

const getRandomInt = (delta = DELTA_UNIT) => {
  const min = Math.ceil(-delta)
  const max = Math.floor(delta)

  return Math.floor(Math.random() * (max - min) + min)
}

const getRandomIntInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// I don't want to train the model with huge top offsets
const getTopOffset = (node) => {
  const { rect, nodeName = '', classList = '' } = node
  const { top } = rect

  if (nodeName.toLowerCase().includes('footer') || classList?.toLowerCase().includes('footer')) {
    const footerOffset = getRandomIntInRange(MIN_OFFSET_FOR_FOOTER, MAX_OFFSET_FOR_REPOSITION)

    return top > MIN_PAGE_SCROLL_WITHOUT_OFFSET ? top - footerOffset : top
  }

  // All elements above 5000px receive an offset
  if (top > MAX_PAGE_SCROLL_WITHOUT_OFFSET) {
    return top - getRandomIntInRange(MIN_OFFSET_FOR_REPOSITION, MAX_PAGE_SCROLL_WITHOUT_OFFSET)
  }

  if (top > MIN_PAGE_SCROLL_WITHOUT_OFFSET) {
    const adjustScroll = adjustScrollPosition()
    const offset = getRandomIntInRange(NO_OFFSET, top - MIN_OFFSET_FOR_REPOSITION)

    return adjustScroll ? top - offset : NO_OFFSET
  }

  return NO_OFFSET
}

function stylesHaveVisibleBackgroundOrBorder(styles) {
  // TODO -> change to include the rect data for the divs once the scraper is updated
  return false

  for (const visibleStyle of STYLES_TO_CHECK_VISIBILITY) {
    if (styles[visibleStyle]) {
      return true
    }
  }
}
