const buildTrainingData = (node = {}) => {
  if (!node) {
    return
  }

  const { nodeName, children, rect, orientation = ORIENTATION.NOT_ALIGNED } = node

  let prompt
  let completion
  let trainingSet = []

  // If the node is not aligned, we go recursively through the children
  if (orientation === ORIENTATION.NOT_ALIGNED) {
    if (!children?.length || CONTENT_TAGS[nodeName]) {
      return null
    }

    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData(child)
    })

    return trainingSet.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  // We normalize the individual container's position to the top left of the page half of the time
  // And for first level children, we only adjust for the page's scroll position half of the time

  // First try is to get the trainig data for the body / root node
  prompt = buildPrompt({ node })
  prompt += ` ${GPT_END_OF_PROMPT}`

  completion = buildCompletion({ node })
  completion = ` ${completion} ${GPT_END_OF_COMPLETION}`

  // If we have a prompt too short we don't include it, and we don't visit the children either
  if (prompt?.length < MIN_CHARS || completion?.length < MIN_CHARS) {
    return null
  }

  if (prompt.length + completion.length > MAX_CHARS) {
    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData(child)
    })

    return trainingSet.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  return [{ prompt, completion }]
}

const buildPrompt = (props) => {
  const { node, posAdjustment } = props
  const { nodeName, children } = node

  const { elType, rectData } = getElTypeAndRectData(node, posAdjustment)

  markForTesting({ node })

  if (isAbsolutePosOrUnaligned(node)) {
    markForTesting({ node, hideElement: true })
    return NO_DATA
  }

  let result = `[${elType} ${rectData}]`

  if (elType === DIV_LABELS.DIV) {
    result = NO_DATA

    markForTesting({ node, hideElement: true })
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
  const { node, posAdjustment } = props
  const { nodeName, children } = node

  const { elType, rectData } = getElTypeAndRectData(node, posAdjustment)

  if (isAbsolutePosOrUnaligned(node)) {
    return NO_DATA
  }

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
function isAbsolutePosOrUnaligned(node) {
  const { children, orientation, styles, rect } = node
  const { top, left, width, height } = rect

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

const adjustScrollPosition = () => Math.random() <= SCROLL_ADJUSTMENT_PERCENTAGE

const includeChildrenOfContentEl = () => Math.random() <= INCLUDED_CONTENT_CHILD

const includeContainerInPrompt = (divPercentage) =>
  Math.random() < FIFTY_PERCENT ? (Math.random() <= divPercentage ? DIV_PERCENTAGE : 0) : 0

// In this version we don't take the orientation into account
const getElTypeAndRectData = (node, posAdjustment = {}) => {
  const { nodeName: tag, rect, children } = node
  const { leftAdj = 0, topAdj = 0 } = posAdjustment

  const elType = CONTAINER_TAGS[tag]
    ? children
      ? DIV_LABELS.DIV
      : DIV_LABELS.PROXY
    : CONTENT_TAG_LABEL[tag]

  const rectData = `x${rect.left - leftAdj} y${rect.top - topAdj} w${rect.width} h${rect.height}`

  return {
    elType,
    rectData,
  }
}

function enrichData(trainingData = []) {
  const enrichedData = []
  const negativeNrPattern = /[xy]-\d+/g

  trainingData = trainingData.filter((data) => {
    const { prompt, completion } = data
    return !prompt.match(negativeNrPattern) && !completion.match(negativeNrPattern)
  })

  for (let i = 0; i < trainingData.length; i++) {
    let { prompt, completion } = trainingData[i]

    prompt = prompt.replace(/x(\d+)/g, (match, p1) => `x${getNewCoordinate(parseInt(p1))}`)
    prompt = prompt.replace(/y(\d+)/g, (match, p1) => `y${getNewCoordinate(parseInt(p1))}`)

    enrichedData[i] = { prompt, completion }
  }

  return trainingData.concat(enrichedData)
}

function getNewCoordinate(coordinate) {
  const delta = getRandomInt()
  return coordinate + delta < 0 ? 0 : coordinate + delta
}

function getRandomInt(delta = SPACE_UNIT) {
  const min = Math.ceil(-delta)
  const max = Math.floor(delta)

  return Math.floor(Math.random() * (max - min) + min)
}
