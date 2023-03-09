// Parsing all the html

const SPACE_UNIT = 4
const ORIENTATION_THRESHOLD = 0.7
const ALIGNMENT_TOLERANCE = 10

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

const ORIENTATION_LABEL = {
  [ORIENTATION.ROW]: 'row',
  [ORIENTATION.COL]: 'col',
  [ORIENTATION.GRID]: 'grid',
  [ORIENTATION.BLOCK_INLINE]: 'inline',
  [ORIENTATION.NOT_ALIGNED]: 'NA',
  [ORIENTATION.ROW_WR]: 'rw',
  [ORIENTATION.COL_WR]: 'cw',
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

const MIN_CHARS = 50
const MAX_CHARS = 4000

const CHILD_LEVELS_TO_COVER = 2
const DIV_PERCENTAGE = 0.3

const NO_DATA = ''

const GPT_END_OF_PROMPT = '\n\n###\n\n'
const GPT_END_OF_COMPLETION = 'END'

let docHeight
let docWidth

function getDOMData() {
  const t0 = performance.now()
  const body = document.body

  docHeight = body.scrollHeight
  docWidth = body.scrollWidth

  treeData = getTreeData(body)
  console.log(treeData)

  let trainingData

  trainingData = buildTrainingData(treeData)
  trainingData = enrichData(trainingData)

  console.log(trainingData)
  const t1 = performance.now()

  console.log(t1 - t0, 'milliseconds')

  return trainingData
}

const buildTrainingData = (node, levelsToCover = 0, currentLevel = 0) => {
  const { tagName, rect, children, orientation = ORIENTATION.NOT_ALIGNED, element } = node

  let prompt
  let completion

  // In this case we only return the trainig data for the body / root node
  if (levelsToCover === 0) {
    prompt = buildPrompt({ node })
    prompt += ` ${GPT_END_OF_PROMPT}`

    completion = buildCompletion({ node })
    completion = ` ${completion} ${GPT_END_OF_COMPLETION}`

    // If the prompt is too long or the body is not aligned, we get data for each container X levels deep
    if (prompt.length + completion.length > MAX_CHARS || orientation === ORIENTATION.NOT_ALIGNED) {
      return buildTrainingData(node, CHILD_LEVELS_TO_COVER)
    }

    return [{ prompt, completion }]
  }

  if (!children?.length || CONTENT_TAGS[tagName]) {
    return null
  }

  let trainingSet = []

  // We normalize the individual container's position to the top left of the page half of the time
  // And for first level children, we only adjust for the page's scroll position half of the time
  const adjustPosition = adjustPositionToPageStart()
  const posAdjustment = {
    leftAdj: currentLevel > 1 && adjustPosition ? rect.left : 0,
    topAdj: currentLevel > 0 && adjustPosition ? rect.top : 0,
  }

  const includeContentChild = includeChildrenOfContentEl()

  // We only get data for divs that are aligned
  if (orientation !== ORIENTATION.NOT_ALIGNED) {
    const divPercentage = DIV_PERCENTAGE

    prompt = buildPrompt({ node, posAdjustment, includeContentChild, divPercentage })
    prompt += ` ${GPT_END_OF_PROMPT}`

    completion = buildCompletion({ node, posAdjustment, includeContentChild })
    completion = ` ${completion} ${GPT_END_OF_COMPLETION}`

    // We only include the data if the prompt and completion are not too long
    if (prompt?.length > MIN_CHARS && prompt?.length + completion?.length < MAX_CHARS) {
      trainingSet.push({ prompt, completion })
    }

    // If we have a prompt too short we don't include it, and we don't visit the children either
    if (prompt?.length < MIN_CHARS || completion?.length < MIN_CHARS) {
      return null
    }
  }

  currentLevel++

  if (currentLevel <= levelsToCover) {
    const childrenTrainingSet = children.map((child) => {
      return buildTrainingData(child, levelsToCover, currentLevel)
    })

    trainingSet = trainingSet.concat(...childrenTrainingSet.filter((data) => data !== null))
  }

  return trainingSet
}

const buildCompletion = (props) => {
  const { node, includeContentChild = true, posAdjustment } = props
  const { tagName, children } = node

  const { elType, rectData } = getElTypeAndRectData(node, posAdjustment)

  if (!elType || elType === ORIENTATION_LABEL.NOT_ALIGNED) {
    return NO_DATA
  }

  let result = `[${elType} ${rectData}`

  if (CONTENT_TAGS[tagName] && !includeContentChild) {
    return `${result}]`
  }

  if (!children?.length) {
    return `${result}]`
  }

  children.forEach((child) => {
    result += buildCompletion({ ...props, node: child })
  })

  return `${result}]`
}

const buildPrompt = (props) => {
  const { node, divPercentage = 0, includeContentChild = true, posAdjustment } = props
  const { tagName, children } = node

  const { elType, rectData } = getElTypeAndRectData(node, posAdjustment)

  if (!elType || elType === ORIENTATION_LABEL.NOT_ALIGNED) {
    return NO_DATA
  }

  let result = `[${elType} ${rectData}]`

  if (CONTENT_TAGS[tagName] && !includeContentChild) {
    return result
  }

  if (!children?.length) {
    return result
  }

  // We include some containers in the prompt, for data variation
  if (CONTAINER_TAGS[tagName] && !includeContainerInPrompt(divPercentage)) {
    result = NO_DATA
  }

  children.forEach((child) => {
    result += buildPrompt({ ...props, node: child })
  })

  return result
}

const POS_ADJUSTMENT_PERCENTAGE = 0.5
const adjustPositionToPageStart = () => Math.random() <= POS_ADJUSTMENT_PERCENTAGE

const INCLUDE_CONTENT_CHILD = 0.7
const includeChildrenOfContentEl = () => Math.random() <= INCLUDE_CONTENT_CHILD

const includeContainerInPrompt = (divPercentage) => Math.random() <= divPercentage

const getElTypeAndRectData = (node, posAdjustment = {}) => {
  const { tagName: tag, rect, orientation } = node
  const { leftAdj = 0, topAdj = 0 } = posAdjustment

  const elType = CONTAINER_TAGS[tag] ? ORIENTATION_LABEL[orientation] : CONTENT_TAG_LABEL[tag]
  const rectData = `x${rect.left - leftAdj} y${rect.top - topAdj} w${rect.width} h${rect.height}`

  return {
    elType,
    rectData,
  }
}

function getTreeData(element) {
  let { children, tagName } = element

  const { top, left, width, height } = addOffsetToRect(element.getBoundingClientRect())

  const result = {
    element,
    tagName: tagName,
    rect: { top, left, width, height },
    styles: getCSSProperties(element, tagName),
  }

  if (tagName === 'INPUT') {
    return {
      ...result,
      type: element.type,
    }
  }

  if (tagName === 'svg' || tagName === 'SELECT') {
    return result
  }

  if (CONTENT_TAGS[tagName] && children?.length === 1 && isChildRedundant(element, children[0])) {
    return result
  }

  // Omit div in div, until we find a container with multiple children or we reach a content element
  children = getContainerWithMultipleChildrenOrContent(element)

  if (!children?.length) {
    return result
  }

  const orientation = getOrientation(children)

  // Mark it for testing purposes
  // element.style.outline = '4px solid ' + ORIENTATION_COLOR[orientation]
  // element.style.outlineOffset = orientation === ORIENTATION.ROW ? '-3px' : '0px'

  result.orientation = orientation
  result.children = []

  children.forEach((child) => {
    result.children.push(getTreeData(child))
  })

  return result
}

function getCSSProperties(element, tagName) {
  const computedStyles = getComputedStyle(element)
  const styles = {}

  let properties = STYLE_PROPERTIES.COMMON

  // If element is container we add the container properties
  if (CONTAINER_TAGS[tagName]) {
    properties = properties.concat(STYLE_PROPERTIES.CONTAINER)
  }

  for (const property of properties) {
    styles[property] = computedStyles.getPropertyValue(property)
  }

  return styles
}

function filterChildrenToCriteria(children) {
  const parentTagName = children[0]?.parentElement?.tagName || ''

  return children.filter((child) => {
    if (isNotVisible(child)) {
      return
    }

    if (hasAbsolutePosition(child)) {
      return
    }

    // Filter any other type of element, except content or container tags
    if (!CONTAINER_TAGS[child.tagName] && !CONTENT_TAGS[child.tagName]) {
      return
    }
    return true
  })
}

// If we have DIV IN DIV, we skip the intermediate divs, until we find a container with multiple
// children or we reach the content
function getContainerWithMultipleChildrenOrContent(element) {
  let { children, tagName } = element

  children = filterChildrenToCriteria(Array.from(children))

  // If the element has only one child, and that child is a container, we continue
  if (children.length === 1 && CONTAINER_TAGS[tagName] && CONTAINER_TAGS[children[0]?.tagName]) {
    return getContainerWithMultipleChildrenOrContent(children[0])
  }

  return children
}

function getOrientation(elementList) {
  if (!elementList || elementList.length < 1) {
    return ORIENTATION.NOT_ALIGNED
  }

  if (elementList.length === 1) {
    return ORIENTATION.ROW
  }

  // If the parent element has flex or grid set on it, we can use those values
  const parentElement = elementList[0].parentElement
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
  const orientationFromPos = getOrientationBasedOnPosition(elementList, parentDisplay)
  if (orientationFromPos && orientationFromPos !== ORIENTATION.NOT_ALIGNED) {
    return orientationFromPos
  }

  // If the parent has grid display, and does not fit a row or column pattern, we return grid
  // TO DO: experiment with returning grid earlier ->before the orientation based on position
  if (parentDisplay === DISPLAY_GRID) {
    return ORIENTATION.GRID
  }
  // console.log('--- NOT ALIGNED---- ', elementList[0].parentElement)

  return ORIENTATION.NOT_ALIGNED
}

function hasAbsolutePosition(element) {
  while (element && element !== document.body) {
    let style = getComputedStyle(element)
    if (style.position === 'absolute') {
      return true
    }

    element = element.parentElement
  }

  return false
}

function isNotVisible(element) {
  const styles = getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  const offsetRect = addOffsetToRect(rect)

  // We include the ones that have display contents
  if (styles.display === 'contents') {
    element.style.display = 'block'
    return
  }

  // Exclude non visible elements or the ones outside the viewport
  if (
    offsetRect.left >= docWidth ||
    offsetRect.top >= docHeight ||
    offsetRect.rigth <= 0 ||
    offsetRect.bottom <= 0 ||
    offsetRect.width === 0 ||
    offsetRect.height === 0 ||
    styles.visibility === 'hidden'
  ) {
    return true
  }
}

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

function isChildRedundant(element, child = {}) {
  // There may be cases where an anchor tag has a child that is not a text node
  if (element?.innerText?.trim() === child?.innerText?.trim() && !hasMediaElement(element)) {
    return true
  }

  return false
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

// We try to calculate the orientation based on elements' position
function getOrientationBasedOnPosition(elementList, parentDisplay) {
  const topValues = []
  const bottomValues = []
  const leftValues = []
  const rightValues = []
  const horizontalPosOfCenter = []
  const verticalPosOfCenter = []
  let allElementsAreInline = true

  for (let i = 0; i < elementList.length; i++) {
    const currentEl = elementList[i]
    const rect = currentEl.getBoundingClientRect()

    const currentElStyle = getComputedStyle(currentEl)
    const currentElDisplay = currentElStyle.getPropertyValue('display')

    if (currentElDisplay !== 'inline' && currentElDisplay !== 'inline-block') {
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

  // Get the max difference in each case
  const topDiff = topValues[topValues.length - 1] - topValues[0]
  const bottomDiff = bottomValues[bottomValues.length - 1] - bottomValues[0]
  const leftDiff = leftValues[leftValues.length - 1] - leftValues[0]
  const rightDiff = rightValues[rightValues.length - 1] - rightValues[0]
  const horDiff = horizontalPosOfCenter[horizontalPosOfCenter.length - 1] - horizontalPosOfCenter[0]
  const verDiff = verticalPosOfCenter[verticalPosOfCenter.length - 1] - verticalPosOfCenter[0]

  // The first check for alignment is a basic one, checking if the diff is within the tolerance
  const horizontal = topDiff <= ALIGNMENT_TOLERANCE || bottomDiff <= ALIGNMENT_TOLERANCE
  const vertical = leftDiff <= ALIGNMENT_TOLERANCE || rightDiff <= ALIGNMENT_TOLERANCE

  if (horizontal && !vertical) {
    return ORIENTATION.ROW
  }
  if (vertical && !horizontal) {
    return ORIENTATION.COL
  }

  // Second check compares the deviation from center on the 2 axis
  if (
    verDiff < horDiff * ORIENTATION_THRESHOLD &&
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
    verDiff * ORIENTATION_THRESHOLD > horDiff &&
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

function getRandomInt(delta = SPACE_UNIT) {
  const min = Math.ceil(-delta)
  const max = Math.floor(delta)

  return Math.floor(Math.random() * (max - min) + min)
}

function getNewCoordinate(coordinate) {
  const delta = getRandomInt()
  return coordinate + delta < 0 ? 0 : coordinate + delta
}

function enrichData(trainingData) {
  const enrichedData = []

  for (let i = 0; i < trainingData.length; i++) {
    let { prompt, completion } = trainingData[i]

    prompt = prompt.replace(/x(\d+)/g, (match, p1) => `x${getNewCoordinate(parseInt(p1))}`)
    prompt = prompt.replace(/y(\d+)/g, (match, p1) => `y${getNewCoordinate(parseInt(p1))}`)

    enrichedData[i] = { prompt, completion }
  }

  return trainingData.concat(enrichedData)
}
