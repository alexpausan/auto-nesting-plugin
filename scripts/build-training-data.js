let slotsToBuildTrainingDataFor = {}

const parseSlots = ({ version } = {}) => {
  const result = []
  // Inception... If I found some slots, I need to build the training data for them too and add it to the result
  // Add a reprocess flag...
  Object.values(slotsToBuildTrainingDataFor).forEach((slot) => {
    const { node, reparsed } = slot
    if (!reparsed) {
      slot.reparsed = true

      const slotTrainingData = buildTrainingData({ node, version, reparsingSlot: true }) || []
      result.push(...slotTrainingData)
    }
  })
  // Reinitialize the object to avoid reprocessing the same slots
  slotsToBuildTrainingDataFor = {}
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
  if (!testingOnLocalHost && orientation === ORIENTATION.NOT_ALIGNED) {
    if (!children?.length || CONTENT_TAGS[nodeName]) {
      return null
    }

    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData({ ...props, node: child })
    })

    return result.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  // If we receive a version argument, then it's in testing mode so we don't override the offset
  const topOffset = version ? 0 : getTopOffset(node)
  // const topOffset = 0

  // TODO: refactor buildPrompt & buildCompletion into a single function
  prompt = buildPrompt({ node, topOffset, reparsingSlot, version })
  prompt += ` ${GPT_END_OF_PROMPT}`

  completion = buildCompletion({ node, topOffset, version, reparsingSlot })
  completion = ` ${completion} ${GPT_END_OF_COMPLETION}`

  // If the node root is a slot, we process it that way, and skip the individual slot!
  // In this case it was halucinating !!!
  if (PROMPT_WITH_ONLY_ONE_SLOT.test(prompt)) {
    return null
  }

  // If we have a prompt too short we don't include it, and we don't visit the children either

  // If we have a prompt too short we don't include it, and we don't visit the children either
  if (!version) {
    if (prompt?.length < MIN_PROMPT_LENGTH || completion?.length < MIN_PROMPT_LENGTH) {
      return null
    }

    // Normalize the training set items length.
    if (prompt?.length < MIN_PROMPT_LENGTH * 2) {
      if (prompt?.length < MIN_PROMPT_LENGTH * 1.5 && Math.random() < 0.5) {
        return null
      } else if (Math.random() < 0.4) {
        return null
      }
    }
  }

  const maxPromptLength = version ? MAX_PROMPT_LENGTH / 1.5 : MAX_PROMPT_LENGTH
  // If the prompt is too long, we get the training data from the children
  if (prompt.length + completion.length > maxPromptLength) {
    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData({ ...props, node: child })
    })

    return result.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  result.push({ prompt, completion })

  return result
}

const buildPrompt = (props) => {
  const { node, topOffset, reparsingSlot, version } = props
  const { nodeName, children, rect } = node

  if (rect.top < 0 || rect.left < 0) {
    return NO_DATA
  }

  const elType = getElType(node)
  const rectData = getRectData(rect, topOffset, version)

  if (isAbsolutePosOrUnaligned(node)) {
    markForTesting({ node, hideElement: true })
    return NO_DATA
  }

  markForTesting({ node })

  const typePrefix = version === 'v14' ? 'type:' : ''
  let result = elType !== DIV_LABELS.DIV ? `{type:${elType},${rectData}}` : NO_DATA

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
      result = `{type:${DIV_LABELS.SLOT},${rectData}}`
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

  result = elType === DIV_LABELS.DIV ? `{type:${elType}` : `{type:${elType},${rectData}`

  // For any type of element that is a leaf, we include the rect data
  if (!children?.length) {
    return `${result}}`
  }

  if (CONTENT_TAGS[nodeName] && nodeName !== NODE_NAME.ANCHOR) {
    return `${result}}`
  }

  // Visible divs are returned as slots and also added in separate prompts
  if (elType === DIV_LABELS.DIV && divHasVisibleStyles(node) && !reparsingSlot) {
    return `{type:${DIV_LABELS.SLOT},${rectData}}`
  }

  result += ',children:['

  children.forEach((child) => {
    result += buildCompletion({ ...props, node: child })
  })

  return `${result}]}`
}

const adjustScrollPosition = () => Math.random() <= SCROLL_ADJUSTMENT_PERCENTAGE

const isAbsolutePosOrUnaligned = (node) => {
  if (testingOnLocalHost) {
    return false
  }

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

const getRectData = (rect, topOffset = 0, version = 'v14') => {
  const { top, left, width, height } = rect
  const newTop = top - topOffset
  const bottom = newTop + height
  const right = left + width

  return version === 'v16'
    ? `top:${newTop},bottom:${bottom},left:${left},right:${right},height:${height},width:${width}`
    : `top:${newTop},left:${left},height:${height},width:${width}`
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

  if (nodeName === NODE_NAME.BODY) {
    return
  }

  for (const visibleStyle of STYLES_THAT_MAKE_DIV_VISIBLE) {
    if (styles[visibleStyle]) {
      // && style !== none... to check pairs: border-style and border-width, etc...
      return true
    }
  }
}
