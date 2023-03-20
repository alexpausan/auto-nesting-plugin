// Parsing all the html

const CONTAINER_TAGS = {
  BODY: true,
  DIV: true,
  COL: true,
  COLGROUP: true,
  FOOTER: true,
  FORM: true,
  HEADER: true,
  MAIN: true,
  MENU: true,
  NAV: true,
  OBJECT: true,
  OL: true,
  UL: true,
  LI: true,
  DL: true,
  DT: true,
  DD: true,
  SECTION: true,
  SUMMARY: true,
  TABLE: true,
  TBODY: true,
  TD: true,
  TFOOT: true,
  TH: true,
  THEAD: true,
  TR: true,
  ASIDE: true,
  ARTICLE: true,
  FIGURE: true,
  FIELDSET: true,
  FIGURE: true,
  HGROUP: true,
}

const CONTENT_TAGS = {
  A: true,
  P: true,
  SPAN: true,
  H1: true,
  H2: true,
  H3: true,
  H4: true,
  H5: true,
  H6: true,
  LABEL: true,
  STRONG: true,
  EM: true,
  IMG: true,
  PICTURE: true,
  BUTTON: true,
  INPUT: true,
  AUDIO: true,
  VIDEO: true,
  I: true,
  B: true,
  U: true,
  S: true,
  EM: true,
  STRONG: true,
  ABBR: true,
  ADDRESS: true,
  PRE: true,
  CODE: true,
  SMALL: true,
  BIG: true,
  HR: true,
  TEXTAREA: true,
  SELECT: true,
  IFRAME: true,
  '#text': true,
}

const CONTENT_TAG_LABEL = {
  A: 'link',
  P: 'text',
  SPAN: 'text',
  H1: 'heading',
  H2: 'heading',
  H3: 'heading',
  H4: 'heading',
  H5: 'heading',
  H6: 'heading',
  LABEL: 'text',
  STRONG: 'text',
  ABBR: 'text',
  ADDRESS: 'text',
  PRE: 'text',
  CODE: 'text',
  SMALL: 'text',
  I: 'text',
  B: 'text',
  U: 'text',
  S: 'text',
  EM: 'text',
  IMG: 'img',
  PICTURE: 'img',
  SVG: 'img',
  svg: 'img',
  BUTTON: 'button',
  INPUT: 'input',
  TEXTAREA: 'input',
  SELECT: 'input',
  AUDIO: 'audio',
  VIDEO: 'video',
  HR: 'hr',
  IFRAME: 'iframe',
  '#text': 'text',
}

const ORIENTATION = {
  ROW: 'ROW',
  COL: 'COL',
  GRID: 'GRID',
  BLOCK_INLINE: 'BLOCK_INLINE',
  NOT_ALIGNED: 'NOT_ALIGNED',
  ROW_WR: 'ROW_WR',
  COL_WR: 'COL_WR',
}

const DISPLAY_GRID = 'grid'
const DIV_LABELS = {
  DIV: 'div',
  PROXY: 'proxy',
}

const ORIENTATION_LABEL = {
  [ORIENTATION.ROW]: 'div',
  [ORIENTATION.COL]: 'div',
  [ORIENTATION.GRID]: 'div',
  [ORIENTATION.BLOCK_INLINE]: 'div',
  [ORIENTATION.NOT_ALIGNED]: 'NA',
  [ORIENTATION.ROW_WR]: 'div',
  [ORIENTATION.COL_WR]: 'div',
}

const ORIENTATION_COLOR = {
  [ORIENTATION.ROW]: 'rgba(255, 0, 0, 0.6)',
  [ORIENTATION.ROW_WR]: 'magenta',
  [ORIENTATION.COL]: 'rgba(0, 255, 255, 0.7)',
  [ORIENTATION.COL_WR]: 'pink',
  [ORIENTATION.GRID]: 'green',
  [ORIENTATION.BLOCK_INLINE]: 'yellow',
  [ORIENTATION.NOT_ALIGNED]: 'black',
}

const STYLE_PROPERTIES = {
  CONTAINER: [
    'flex-direction',
    'align-items',
    'justify-content',
    'flex-wrap',
    'flex-basis',
    'flex-grow',
    'flex-shrink',
    'grid-template-columns',
    'grid-template-rows',
    'background-color',
    'background-image',
    'gap',
    'padding',
    'margin',
  ],
  COMMON: ['position', 'display', 'align-self', 'border-width', 'font-size'],
}

const NODE_NAME = {
  TEXT: '#text',
  INPUT: 'INPUT',
  SVG: 'svg',
  SELECT: 'SELECT',
}

const MIN_CHARS = 60
const MAX_CHARS = 4000

const NO_DATA = ''

const GPT_END_OF_PROMPT = '###'
const GPT_END_OF_COMPLETION = 'END'

const SPACE_UNIT = 4
const ALIGNMENT_TOLERANCE = 10
const MAX_NAV_TOP = 10
const MAX_NAV_SIZE = 120

const SCROLL_ADJUSTMENT_PERCENTAGE = 0.5
const MIN_PAGE_SCROLL_WITHOUT_OFFSET = 2000
const MAX_PAGE_SCROLL_WITHOUT_OFFSET = 20000

const INCLUDED_CONTENT_CHILD = 0.7
const FIFTY_PERCENT = 0.5
const DIV_PERCENTAGE = 0.2

let docHeight
let docWidth

function getDOMData() {
  const body = document.body

  docHeight = body.scrollHeight
  docWidth = body.scrollWidth

  const tree = getTreeData(body)

  let trainingData = buildTrainingData(tree)
  trainingData = enrichData(trainingData)

  console.log(tree)
  console.log(trainingData)
  return trainingData
}

function getTreeData(node) {
  let { nodeName } = node

  const nodeRect = getNodeRect(node)
  const { top, left, width, height } = addOffsetToRect(nodeRect)

  const result = {
    node,
    nodeName,
    rect: { top, left, width, height },
    styles: getCSSProperties(node, nodeName),
  }

  if (nodeName === NODE_NAME.SVG || nodeName === NODE_NAME.SELECT || nodeName === NODE_NAME.TEXT) {
    return result
  }

  if (nodeName === NODE_NAME.INPUT) {
    return {
      ...result,
      type: node.type,
    }
  }

  // Omit div in div, until we find a container with multiple children or we reach a content node
  let children = getChildrenWithoutExtraDivs(node)

  if (CONTENT_TAGS[nodeName] && children?.length === 1 && isChildRedundant(node, children[0])) {
    return result
  }

  if (!children?.length) {
    return result
  }

  if (children.length > 1) {
    const orientation = getOrientation(children)
    result.orientation = children?.length > 1 ? orientation : ''

    // Mark it for testing purposes
    node.style.outline = '4px solid ' + ORIENTATION_COLOR[orientation]
    node.style.outlineOffset = orientation === ORIENTATION.ROW ? '-3px' : '0px'
  }

  result.children = []

  children.forEach((child) => {
    result.children.push(getTreeData(child))
  })

  return result
}

const buildTrainingData = (node) => {
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

  const includeContentChild = includeChildrenOfContentEl()
  const divPercentage = Math.random() < FIFTY_PERCENT ? DIV_PERCENTAGE : 0

  // We normalize the individual container's position to the top left of the page half of the time
  // And for first level children, we only adjust for the page's scroll position half of the time
  const adjustScroll = adjustScrollPosition()
  const posAdjustment = {
    leftAdj: 0,
    topAdj:
      rect.top < MIN_PAGE_SCROLL_WITHOUT_OFFSET ||
      (rect.top < MAX_PAGE_SCROLL_WITHOUT_OFFSET && !adjustScroll)
        ? 0
        : rect.top,
  }

  // First try is to get the trainig data for the body / root node
  prompt = buildPrompt({ node, posAdjustment, includeContentChild, divPercentage })
  prompt += ` ${GPT_END_OF_PROMPT}`

  completion = buildCompletion({ node, posAdjustment, includeContentChild })
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
  const { node, divPercentage = 0, includeContentChild = true, posAdjustment } = props
  const { nodeName, children } = node

  const { elType, rectData } = getElTypeAndRectData(node, posAdjustment)

  if (isAbsolutePosOrUnaligned(node)) {
    return NO_DATA
  }

  // We include some containers in the prompt, for data variation
  const includeDiv = includeContainerInPrompt(divPercentage)

  let result = elType === DIV_LABELS.DIV && !includeDiv ? NO_DATA : `[${elType} ${rectData}]`

  if (!children?.length) {
    return result
  }

  if (CONTENT_TAGS[nodeName] && !includeContentChild) {
    return result
  }

  children.forEach((child) => {
    result += buildPrompt({ ...props, node: child })
  })

  return result
}

const buildCompletion = (props) => {
  const { node, includeContentChild = true, posAdjustment } = props
  const { nodeName, children } = node

  const { elType, rectData } = getElTypeAndRectData(node, posAdjustment)

  if (isAbsolutePosOrUnaligned(node)) {
    return NO_DATA
  }

  let result = `[${elType} ${elType === DIV_LABELS.DIV ? NO_DATA : rectData}]`

  // For any type of element that is a leaf, we include the rect data
  if (!children?.length) {
    return `${result}]`
  }

  if (CONTENT_TAGS[nodeName] && !includeContentChild) {
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

const includeContainerInPrompt = (divPercentage) => Math.random() <= divPercentage

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

// Only for scraping
function getNodeRect(node) {
  if (node.nodeName === NODE_NAME.TEXT) {
    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, node?.textContent?.trim()?.length)

    return range.getBoundingClientRect()
  }

  return node.getBoundingClientRect()
}

// Only for scraping
function addOffsetToRect(rect) {
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    top: Math.round(rect.top + window.pageYOffset),
    left: Math.round(rect.left + window.pageXOffset),
    bottom: Math.round(rect.bottom + window.pageYOffset),
    right: Math.round(rect.right + window.pageXOffset),
  }
}

// Only for scraping
function getCSSProperties(node, nodeName) {
  const styles = {}
  let properties = STYLE_PROPERTIES.COMMON

  if (nodeName === NODE_NAME.TEXT) {
    const computedStyles = getComputedStyle(node.parentNode)

    for (const property of properties) {
      styles[property] = computedStyles.getPropertyValue(property)
    }

    return {
      ...styles,
      position: 'static',
      display: 'inline',
    }
  }

  const computedStyles = getComputedStyle(node)

  // If node is container we add the container properties
  if (CONTAINER_TAGS[nodeName]) {
    properties = properties.concat(STYLE_PROPERTIES.CONTAINER)
  }

  for (const property of properties) {
    styles[property] = computedStyles.getPropertyValue(property)
  }

  return styles
}

// Only for scraping
// If we have DIV IN DIV, we skip the intermediate divs, until we find a container with multiple
// children or we reach the content
function getChildrenWithoutExtraDivs(node) {
  let { childNodes, nodeName } = node

  let children = filterChildrenToCriteria(Array.from(childNodes))

  // If the node has only one child, and that child is a container, we continue
  if (children.length === 1 && CONTAINER_TAGS[nodeName] && CONTAINER_TAGS[children[0]?.nodeName]) {
    return getChildrenWithoutExtraDivs(children[0])
  }

  return children
}

// Only for scraping
function filterChildrenToCriteria(childNodes) {
  return childNodes.filter((child) => {
    if (child.nodeName === NODE_NAME.TEXT && CONTAINER_TAGS[child.parentNode.nodeName]) {
      return isWithinViewport(child)
    }

    // Filter any other type of node, except content or container tags
    if (CONTAINER_TAGS[child.nodeName] || CONTENT_TAGS[child.nodeName]) {
      return isWithinViewport(child) && !hasAbsolutePosition(child)
    }
  })
}

function getOrientation(nodesList) {
  if (!nodesList || nodesList.length < 1) {
    return ORIENTATION.NOT_ALIGNED
  }

  if (nodesList.length === 1) {
    return ORIENTATION.ROW
  }

  // If the parent element has flex or grid set on it, we can use those values
  const parentElement = nodesList[0].parentElement
  const parentStyle = getComputedStyle(parentElement)
  const parentFlexDirection = parentStyle.getPropertyValue('flex-direction')
  const parentWrap = parentStyle.getPropertyValue('flex-wrap')
  const parentDisplay = parentStyle.getPropertyValue('display')

  if (parentDisplay === 'flex') {
    if (parentFlexDirection === 'row' || parentFlexDirection === 'row-reverse') {
      return parentWrap === 'wrap' ? ORIENTATION.ROW_WR : ORIENTATION.ROW
    }

    if (parentFlexDirection === 'column' || parentFlexDirection === 'column-reverse') {
      return parentWrap === 'wrap' ? ORIENTATION.COL_WR : ORIENTATION.COL
    }
  }

  // We try to calculate the orientation based on elements' position
  const orientationFromPos = getOrientationBasedOnPosition(nodesList, parentDisplay)
  if (orientationFromPos && orientationFromPos !== ORIENTATION.NOT_ALIGNED) {
    return orientationFromPos
  }

  // If the parent has grid display, and does not fit a row or column pattern, we return grid
  // TO DO: experiment with returning grid earlier ->before the orientation based on position
  if (parentDisplay === DISPLAY_GRID) {
    return ORIENTATION.GRID
  }

  return ORIENTATION.NOT_ALIGNED
}

// We try to calculate the orientation based on elements' position
function getOrientationBasedOnPosition(nodesList, parentDisplay) {
  const topValues = []
  const bottomValues = []
  const leftValues = []
  const rightValues = []
  const horizontalPosOfCenter = []
  const verticalPosOfCenter = []
  let allElementsAreInline = true

  for (let i = 0; i < nodesList.length; i++) {
    const currentNode = nodesList[i]
    const rect = getNodeRect(currentNode)

    const currentNodeStyle = getNodeStyles(currentNode)
    const currentNodeDisplay = currentNodeStyle.display

    if (currentNodeDisplay !== 'inline' && currentNodeDisplay !== 'inline-block') {
      allElementsAreInline = false
    }

    topValues.push(rect.top)
    bottomValues.push(rect.bottom)
    leftValues.push(rect.left)
    rightValues.push(rect.right)

    horizontalPosOfCenter.push(rect.left + rect.width / 2)
    verticalPosOfCenter.push(rect.top + rect.height / 2)
  }

  // We use the default sort method, and compare the nr
  topValues.sort((a, b) => a - b)
  bottomValues.sort((a, b) => a - b)
  leftValues.sort((a, b) => a - b)
  rightValues.sort((a, b) => a - b)
  horizontalPosOfCenter.sort((a, b) => a - b)
  verticalPosOfCenter.sort((a, b) => a - b)

  const payload = {
    topValues,
    bottomValues,
    leftValues,
    rightValues,
    horizontalPosOfCenter,
    verticalPosOfCenter,
    parentDisplay,
    allElementsAreInline,
  }

  let computedOrientation = getOrientationBasedOnRects(payload)

  if (computedOrientation === ORIENTATION.NOT_ALIGNED) {
    payload.alignmentTolerance = ALIGNMENT_TOLERANCE * 1.5
    computedOrientation = getOrientationBasedOnRects(payload)
  }

  return computedOrientation
}

function getOrientationBasedOnRects(props) {
  const {
    topValues,
    bottomValues,
    leftValues,
    rightValues,
    horizontalPosOfCenter,
    verticalPosOfCenter,
    parentDisplay,
    allElementsAreInline,
    alignmentTolerance = ALIGNMENT_TOLERANCE,
  } = props

  // Get the max difference in each case
  const topDiff = topValues[topValues.length - 1] - topValues[0]
  const bottomDiff = bottomValues[bottomValues.length - 1] - bottomValues[0]
  const leftDiff = leftValues[leftValues.length - 1] - leftValues[0]
  const rightDiff = rightValues[rightValues.length - 1] - rightValues[0]
  const horDiff = horizontalPosOfCenter[horizontalPosOfCenter.length - 1] - horizontalPosOfCenter[0]
  const verDiff = verticalPosOfCenter[verticalPosOfCenter.length - 1] - verticalPosOfCenter[0]

  // The first check for alignment is a basic one, checking if the diff is within the tolerance
  const horizontal = topDiff <= alignmentTolerance || bottomDiff <= alignmentTolerance
  const vertical = leftDiff <= alignmentTolerance || rightDiff <= alignmentTolerance

  if (horizontal && !vertical) {
    return ORIENTATION.ROW
  }
  if (vertical && !horizontal) {
    return ORIENTATION.COL
  }

  // Second check compares the deviation from center on the 2 axis
  if (
    verDiff <= alignmentTolerance &&
    !arrayHasDuplicates(leftValues) &&
    !arrayHasDuplicates(rightValues)
  ) {
    // If elements are aligned in a row, but the parent is grid, we mimic a row wrap
    if (parentDisplay === DISPLAY_GRID) {
      return ORIENTATION.ROW_WR
    }

    return ORIENTATION.ROW
  }

  if (
    horDiff <= alignmentTolerance &&
    !arrayHasDuplicates(topValues) &&
    !arrayHasDuplicates(bottomValues)
  ) {
    // If elements are aligned in a row, but the parent is grid, we mimic a row wrap
    if (parentDisplay === DISPLAY_GRID) {
      return ORIENTATION.COL_WR
    }

    return ORIENTATION.COL
  }

  // There are cases where multiple text elements are used inside a container, and they may not be aligned
  if (parentDisplay === 'block' && allElementsAreInline) {
    return ORIENTATION.BLOCK_INLINE
  }

  return ORIENTATION.NOT_ALIGNED
}

function hasAbsolutePosition(node) {
  while (node && node !== document.body) {
    const styles = getNodeStyles(node)
    const rect = getNodeRect(node)
    const { top, height, width } = addOffsetToRect(rect)

    // We check if the element is absolute or fixed, below 10px from the top (aka navbar)
    // For absolute positioned elements, we do some extra checks (missed when crawled data)
    if (styles?.position?.includes('absolute') || styles?.position?.includes('fixed')) {
      if (top > MAX_NAV_TOP) {
        return true
      }

      // Because the intention is to only include the nav bar, we exclude elements without children
      if (!node.children?.length) {
        return true
      }

      if (height > MAX_NAV_SIZE && width > MAX_NAV_SIZE) {
        return true
      }
    }

    node = node.parentNode
  }

  return false
}

function isWithinViewport(node) {
  // We exclude text nodes that have no content
  if (node.nodeName === NODE_NAME.TEXT && !node.textContent.trim()) {
    return false
  }

  const styles = getNodeStyles(node)
  const rect = getNodeRect(node)
  const offsetRect = addOffsetToRect(rect)

  // We include the ones that have display contents
  if (styles.display === 'contents') {
    node.style.display = 'block'
    return true
  }

  // Exclude non visible elements or the ones outside the viewport
  if (
    offsetRect.left < docWidth &&
    offsetRect.top < docHeight &&
    offsetRect.left > -offsetRect.width &&
    offsetRect.top > -offsetRect.height &&
    offsetRect.right > 0 &&
    offsetRect.bottom > 0 &&
    offsetRect.width !== 0 &&
    offsetRect.height !== 0 &&
    styles.visibility !== 'hidden'
  ) {
    return true
  }
}

function isChildRedundant(element, child = {}) {
  const childText =
    child.nodeName === NODE_NAME.TEXT ? child?.textContent?.trim() : child?.innerText?.trim()

  // There may be cases where an anchor tag has a child that is not a text node
  if (element?.innerText?.trim() === childText && !hasMediaElement(element)) {
    return true
  }

  return false
}

function getNodeStyles(node) {
  if (node.nodeName === NODE_NAME.TEXT) {
    return {
      position: 'static',
      display: 'inline',
    }
  }
  return getComputedStyle(node)
}

function hasMediaElement(anchorTag) {
  const innerHTML = anchorTag.innerHTML
  const mediaRegex = /<audio|video|img|svg|picture|canvas|map/gi
  return mediaRegex.test(innerHTML)
}

function arrayHasDuplicates(arr) {
  const obj = {}
  for (let i = 0; i < arr.length; i++) {
    if (obj[arr[i]]) {
      return true // found a duplicate, stop and return true
    }
    obj[arr[i]] = true // add current element as key to the object
  }
  return false // no duplicates found
}

function getRandomInt(delta = SPACE_UNIT) {
  const min = Math.ceil(-delta)
  const max = Math.floor(delta)

  return Math.floor(Math.random() * (max - min) + min)
}

function getNewCoordinate(coordinate) {
  const delta = getRandomInt()
  return coordinate + delta < 0 ? 0 : coordinate + delta
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
