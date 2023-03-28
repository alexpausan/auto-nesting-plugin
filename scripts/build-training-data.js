const slotsToBuildTrainingDataFor = {}

const parseSlots = ({ version }) => {
  const result = []
  // Inception... If I found some slots, I need to build the training data for them too and add it to the result
  // Add a reprocess flag...
  Object.values(slotsToBuildTrainingDataFor).forEach((slot) => {
    const { node, reparsed } = slot
    if (!reparsed) {
      slot.reparsed = true

      const slotTrainingData = buildTrainingData({ node, version, reparsingSlot: true })
      result.push(...slotTrainingData)
    }
  })
  return result
}

const buildTrainingData = (props) => {
  const { node, version, reparsingSlot = false } = props

  if (!node) {
    return
  }

  const { nodeName, children, orientation = ORIENTATION.NOT_ALIGNED } = node

  let prompt
  let completion
  const result = []

  // If the node is not aligned, we go recursively through the children
  if (orientation === ORIENTATION.NOT_ALIGNED) {
    if (!children?.length || CONTENT_TAGS[nodeName]) {
      return null
    }

    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData({ ...props, node: child })
    })

    return result.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  // If we receive a version argument, then it's in testing mode so we don't override the offset
  const topOffset = version === 'testing' ? 0 : getTopOffset(node)

  // TODO: refactor buildPrompt & buildCompletion into a single function
  prompt = buildPrompt({ node, topOffset, reparsingSlot })
  prompt += ` ${GPT_END_OF_PROMPT}`

  completion = buildCompletion({ node, topOffset, version, reparsingSlot })
  completion = ` ${completion} ${GPT_END_OF_COMPLETION}`

  // If the node root is a slot, we process it that way, and skip the individual slot!
  // In this case it was halucinating !!!
  if (PROMPT_WITH_ONLY_ONE_SLOT.test(prompt)) {
    return null
  }

  // If we have a prompt too short we don't include it, and we don't visit the children either
  if (
    (prompt?.length < MIN_PROMPT_LENGTH || completion?.length < MIN_PROMPT_LENGTH) &&
    version !== 'testing'
  ) {
    return null
  }

  // If the prompt is too long, we get the training data from the children
  if (prompt.length + completion.length > MAX_PROMPT_LENGTH) {
    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData({ ...props, node: child })
    })

    return result.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  result.push({ prompt, completion })

  return result
}

const buildPrompt = (props) => {
  const { node, topOffset, reparsingSlot } = props
  const { nodeName, children, rect } = node

  if (rect.top < 0 || rect.left < 0) {
    return NO_DATA
  }

  const elType = getElType(node)
  const rectData = getRectData(rect, topOffset)

  if (isAbsolutePosOrUnaligned(node)) {
    markForTesting({ node, hideElement: true })
    return NO_DATA
  }

  markForTesting({ node })

  let result = elType !== DIV_LABELS.DIV ? `[${elType} ${rectData}]` : NO_DATA

  if (!children?.length) {
    return result
  }

  if (CONTENT_TAGS[nodeName] && nodeName !== NODE_NAME.ANCHOR) {
    return result
  }

  let childrenData = ''
  children.forEach((child) => {
    childrenData += buildPrompt({ ...props, node: child })
  })

  // Divs that are not visibly distinguisable from the background, may be included in the prompt or not
  if (elType === DIV_LABELS.DIV) {
    const divIsVisible = divHasVisibleStyles(node)
    markForTesting({ node, hideElement: !divIsVisible })

    // Visible divs are added in separate prompts
    if (divIsVisible && !reparsingSlot) {
      result = `[${DIV_LABELS.SLOT} ${rectData}]`
      const slotID = result

      if (!slotsToBuildTrainingDataFor[slotID]) {
        slotsToBuildTrainingDataFor[slotID] = {
          node,
          reparsed: false,
        }
      }

      return slotID
    }

    if (!divIsVisible) {
      result = NO_DATA
    }
  }

  return result + childrenData
}

const buildCompletion = (props) => {
  const { node, topOffset, version, reparsingSlot } = props
  const { nodeName, children, rect } = node

  if (rect.top < 0 || rect.left < 0) {
    return NO_DATA
  }

  const elType = getElType(node)
  const rectData = getRectData(rect, topOffset)

  if (isAbsolutePosOrUnaligned(node)) {
    return NO_DATA
  }

  let result

  // TODO: if v8 will be used again, compute the rect data from the children rect data ->
  // To include updated rect around the content
  if (version === 'v8') {
    result = `[${elType} ${rectData}`
  } else {
    result = elType === DIV_LABELS.DIV ? `[${elType}` : `[${elType} ${rectData}`
  }

  // For any type of element that is a leaf, we include the rect data
  if (!children?.length) {
    return `${result}]`
  }

  if (CONTENT_TAGS[nodeName] && nodeName !== NODE_NAME.ANCHOR) {
    return `${result}]`
  }

  // Visible divs are returned as slots and also added in separate prompts
  if (elType === DIV_LABELS.DIV && divHasVisibleStyles(node) && !reparsingSlot) {
    return `[${DIV_LABELS.SLOT} ${rectData}]`
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
const getElType = (node) => {
  const { nodeName: tag, children } = node

  return CONTAINER_TAGS[tag]
    ? children
      ? DIV_LABELS.DIV
      : DIV_LABELS.SLOT
    : CONTENT_TAG_LABEL[tag]
}

const getRectData = (rect, topOffset = 0) => {
  const { top, left, width, height } = rect
  return `top${top - topOffset} left${left} width${width} height${height}`
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

function divHasVisibleStyles(node) {
  const { styles, nodeName, rect } = node

  // I limit to divs that are bellow 1000px, even if they have visible styles
  if (nodeName === NODE_NAME.BODY || rect.height > 1000) {
    return
  }

  for (const visibleStyle of STYLES_THAT_MAKE_DIV_VISIBLE) {
    if (styles[visibleStyle]) {
      // && style !== none... to check pairs: border-style and border-width, etc...
      return true
    }
  }
}
