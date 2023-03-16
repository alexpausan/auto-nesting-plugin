// Parsing all the html

const SPACE_UNIT = 4
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

const PROXY_DIV = 'proxy'

const DISPLAY_GRID = 'grid'

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

const MIN_CHARS = 50
const MAX_CHARS = 4000

const CHILD_LEVELS_TO_COVER = 2
const DIV_PERCENTAGE = 0.05

const NO_DATA = ''

const GPT_END_OF_PROMPT = '###'
const GPT_END_OF_COMPLETION = 'END'

const NODE_TYPE = {
  TEXT: '#text',
  INPUT: 'INPUT',
  SVG: 'svg',
  SELECT: 'SELECT',
}

let docHeight
let docWidth

function getDOMData() {
  const body = document.body

  docHeight = body.scrollHeight
  docWidth = body.scrollWidth

  const treeData = getTreeData(body)
  const trainingData = buildTrainingData(treeData)
  return trainingData
}

async function getNestedStructure(flatStructure, model) {
  if (!flatStructure) {
    return
  }

  document.querySelectorAll('.nesting-overlay').forEach((el) => el.remove())

  const t0 = performance.now()

  const payload = {
    model,
    temperature: 0,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop: [']] END'],
  }

  flatStructure.forEach((item) => {
    if (!item.prompt) {
      return
    }

    payload.prompt = item.prompt

    fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer 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',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then(processOpenAIResponse)
      .catch((error) => console.error(error))
  })

  const t1 = performance.now()
  console.log(t1 - t0, 'milliseconds')
}

function processOpenAIResponse(data) {
  if (!data?.choices) {
    return
  }

  const { choices = [] } = data
  let { text = '' } = choices[0]

  if (!text.length) {
    return
  }

  text = text.trim() + ']]'
  const tree = stringToTree(text)

  if (!tree) {
    return
  }

  const treeWithRect = computeContainersRect(tree)
  drawResults(treeWithRect)
}

const DIV_START = /^\[div/
const PARENT_END = /^\]/
const ELEMENT_END = /^\]/
const DIV_PATERN_LENGTH = 4
const CONTENT_ELEMENT = /^\[(\w+)\s*(x\w+)\s*(y\w+)\s*(w\w+)\s*(h\w+)/

const DIV_ELEMENT = 'div'
const LINK_ELEMENT = 'link'

function getFirstWord(str) {
  const match = str.match(/^([^\s\[\]]+)/)
  return match ? match[1] : ''
}

function addOveralyToDom(rect, orientation) {
  const el = document.createElement('div')
  el.classList.add('nesting-overlay')
  el.style.position = 'absolute'
  el.style.border = `4px dashed ${ORIENTATION_COLOR[orientation]}`
  el.style.top = rect.y + 'px'
  el.style.left = rect.x + 'px'
  el.style.width = rect.width + 'px'
  el.style.height = rect.height + 'px'
  el.style.visibility = 'visible'
  el.style.zIndex = 99000

  document.body.appendChild(el)
}

function drawResults(tree) {
  let { type, rect, children, orientation } = tree

  if (type === DIV_ELEMENT && rect) {
    addOveralyToDom(rect, orientation)
  }

  if (children?.length) {
    children.forEach(drawResults)
  }
}

function computeContainersRect(tree) {
  let { type, rect, children } = tree

  if (children?.length) {
    const childrenRects = children.map(computeContainersRect)

    let xValues = childrenRects.map((c) => c.rect.x).sort((a, b) => a - b)
    let yValues = childrenRects.map((c) => c.rect.y).sort((a, b) => a - b)
    let bottomValues = childrenRects.map((c) => c.rect.y + c.rect.height).sort((a, b) => a - b)
    let rightValues = childrenRects.map((c) => c.rect.x + c.rect.width).sort((a, b) => a - b)

    const horizontalPosOfCenter = childrenRects
      .map((c) => c.rect.x + c.rect.width / 2)
      .sort((a, b) => a - b)

    const verticalPosOfCenter = childrenRects
      .map((c) => c.rect.y + c.rect.height / 2)
      .sort((a, b) => a - b)

    let x = xValues[0]
    let y = yValues[0]
    let width = rightValues[rightValues.length - 1] - x
    let height = bottomValues[bottomValues.length - 1] - y

    const payload = {
      topValues: yValues,
      leftValues: xValues,
      bottomValues,
      rightValues,
      horizontalPosOfCenter,
      verticalPosOfCenter,
    }

    const orientation = children?.length > 1 ? getOrientationBasedOnRects(payload) : ORIENTATION.ROW

    if (type === LINK_ELEMENT) {
      x = x < rect.x ? x : rect.x
      y = y < rect.y ? y : rect.y
      width = width > rect.width ? width : rect.width
      height = height > rect.height ? height : rect.height
    }

    rect = {
      x,
      y,
      width,
      height,
    }

    tree.rect = rect
    tree.orientation = orientation
  }

  return tree
}

function stringToTree(data) {
  if (!data) {
    return null
  }

  const stack = []
  let root = null
  let currentNode = null
  let index = 0
  let dataLength = data.length

  while (index < dataLength) {
    let currentText = data.substring(index)

    if (DIV_START.test(currentText)) {
      if (!root) {
        root = { type: DIV_ELEMENT, children: [] }
        currentNode = root
      } else {
        const newNode = { type: DIV_ELEMENT, children: [] }

        if (!currentNode) {
          currentNode = root
          console.info('error - data generation')
          console.log(data)
        }

        currentNode.children = currentNode.children || []
        currentNode.children.push(newNode)
        stack.push(currentNode)
        currentNode = newNode
      }

      index += DIV_PATERN_LENGTH
      continue
    }

    if (PARENT_END.test(currentText)) {
      currentNode = stack.pop()
      index++
      continue
    }

    const match = currentText.match(CONTENT_ELEMENT)

    if (!match) {
      return null
    }

    const elementType = match[1]
    const x = parseInt(match[2].substring(1, match[2].length))
    const y = parseInt(match[3].substring(1, match[3].length))
    const width = parseInt(match[4].substring(1, match[4].length))
    const height = parseInt(match[5].substring(1, match[5].length))

    const newNode = {
      type: elementType,
      rect: {
        x,
        y,
        width,
        height,
      },
    }

    index += match[0].length
    currentText = currentText.substring(match[0].length)

    if (ELEMENT_END.test(currentText)) {
      currentNode.children.push(newNode)
      index++
      continue
    }

    newNode.children = []
    currentNode.children.push(newNode)
    stack.push(currentNode)
    currentNode = newNode
  }

  return root
}

const buildTrainingData = (node, levelsToCover = 0, currentLevel = 0) => {
  const { nodeName, children, orientation = ORIENTATION.NOT_ALIGNED } = node

  let prompt
  let completion
  let trainingSet = []

  if (orientation !== ORIENTATION.NOT_ALIGNED) {
    const includeContentChild = includeChildrenOfContentEl()
    const divPercentage = DIV_PERCENTAGE

    // First try is to get the trainig data for the body / root node
    prompt = buildPrompt({ node, divPercentage, includeContentChild })
    prompt += ` ${GPT_END_OF_PROMPT}`

    completion = buildCompletion({ node })
    completion = ` ${completion} ${GPT_END_OF_COMPLETION}`

    if (prompt.length > MIN_CHARS && prompt.length + completion.length < MAX_CHARS) {
      return [{ prompt, completion }]
    }

    // If we have a prompt too short we don't include it, and we don't visit the children either
    if (prompt?.length < MIN_CHARS || completion?.length < MIN_CHARS) {
      return null
    }
  }

  if (!children?.length || CONTENT_TAGS[nodeName]) {
    return null
  }

  const childrenTrainingSet = children.map((child) => {
    return buildTrainingData(child)
  })

  return trainingSet.concat(...childrenTrainingSet.filter((data) => data !== null))
}

const buildPrompt = (props) => {
  const { node, divPercentage = 0, includeContentChild = true, posAdjustment } = props
  const { nodeName, children, node: domNode } = node

  if (domNode?.classList?.contains('home-footer-section')) {
    console.log('here')
  }

  const { elType, rectData } = getElTypeAndRectData(node, posAdjustment)

  if (elType === ORIENTATION_LABEL.NOT_ALIGNED) {
    domNode.style.visibility = 'hidden'
    return NO_DATA
  }

  let result = `[${elType} ${rectData}]`
  domNode.style.visibility = 'visible'

  if (CONTENT_TAGS[nodeName]) {
    domNode.style.background = 'rgba(0, 0, 0, 0.1)'
  }

  if (CONTENT_TAGS[nodeName] && !includeContentChild) {
    return result
  }

  if (!children?.length) {
    return result
  }

  // We include some containers in the prompt, for data variation
  if (CONTAINER_TAGS[nodeName] && !includeContainerInPrompt(divPercentage)) {
    result = NO_DATA
    domNode.style.visibility = 'hidden'
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

  if (elType === ORIENTATION_LABEL.NOT_ALIGNED) {
    return NO_DATA
  }

  let result = `[${elType}`

  // For any type of element that is a leaf, we include the rect data
  if (!children?.length) {
    return `${result} ${rectData}]`
  }

  result += CONTENT_TAGS[nodeName] ? ` ${rectData}` : ''

  if (CONTENT_TAGS[nodeName] && !includeContentChild) {
    return `${result}]`
  }

  children.forEach((child) => {
    result += buildCompletion({ ...props, node: child })
  })

  return `${result}]`
}

const POS_ADJUSTMENT_PERCENTAGE = 0.5
const MAX_PAGE_SCROLL_WITHOUT_OFFSET = 20000

const adjustPositionToPageStart = () => Math.random() <= POS_ADJUSTMENT_PERCENTAGE

const INCLUDED_CONTENT_CHILD = 0.7
const includeChildrenOfContentEl = () => Math.random() <= INCLUDED_CONTENT_CHILD

const includeContainerInPrompt = (divPercentage) => Math.random() <= divPercentage

const getElTypeAndRectData = (node, posAdjustment = {}) => {
  const { nodeName: tag, rect, orientation } = node
  const { leftAdj = 0, topAdj = 0 } = posAdjustment

  const elType = CONTAINER_TAGS[tag]
    ? orientation
      ? ORIENTATION_LABEL[orientation]
      : PROXY_DIV
    : CONTENT_TAG_LABEL[tag]

  const rectData = `x${rect.left - leftAdj} y${rect.top - topAdj} w${rect.width} h${rect.height}`

  return {
    elType,
    rectData,
  }
}

function getNodeRect(node) {
  if (node.nodeName === NODE_TYPE.TEXT) {
    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, node.length)

    return range.getBoundingClientRect()
  }

  return node.getBoundingClientRect()
}

function getNodeStyles(node) {
  if (node.nodeName === NODE_TYPE.TEXT) {
    return {
      position: 'static',
      display: 'inline',
    }
  }
  return getComputedStyle(node)
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

  if (nodeName === NODE_TYPE.SVG || nodeName === NODE_TYPE.SELECT || nodeName === NODE_TYPE.TEXT) {
    return result
  }

  if (nodeName === NODE_TYPE.INPUT) {
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

function getCSSProperties(node, nodeName) {
  const styles = {}

  if (nodeName === NODE_TYPE.TEXT) {
    return {
      position: 'static',
      display: 'inline',
    }
  }

  const computedStyles = getComputedStyle(node)
  let properties = STYLE_PROPERTIES.COMMON

  // If node is container we add the container properties
  if (CONTAINER_TAGS[nodeName]) {
    properties = properties.concat(STYLE_PROPERTIES.CONTAINER)
  }

  for (const property of properties) {
    styles[property] = computedStyles.getPropertyValue(property)
  }

  return styles
}

function filterChildrenToCriteria(childNodes) {
  return childNodes.filter((child) => {
    // if (child.nodeType === Node.TEXT_NODE && CONTAINER_TAGS[child.parentNode.nodeName]) {
    //   return true
    // }

    // Filter any other type of node, except content or container tags
    if (CONTAINER_TAGS[child.nodeName] || CONTENT_TAGS[child.nodeName]) {
      return isWithinViewport(child) && !hasAbsolutePosition(child)
    }
  })
}

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
  // console.log('--- NOT ALIGNED---- ', nodesList[0].parentElement)

  return ORIENTATION.NOT_ALIGNED
}

function hasAbsolutePosition(element) {
  while (element && element !== document.body) {
    let style = getNodeStyles(element)
    if (style?.position?.includes('absolute') || style?.position?.includes('fixed')) {
      return true
    }

    element = element.parentElement
  }

  return false
}

function isWithinViewport(node) {
  const rect = getNodeRect(node)

  // We take text nodes as visible by default
  if (node.nodeName === NODE_TYPE.TEXT) {
    return true
  }

  const styles = getNodeStyles(node)
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

  return getOrientationBasedOnRects(payload)
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
  } = props

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
    verDiff < ALIGNMENT_TOLERANCE &&
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
    horDiff < ALIGNMENT_TOLERANCE &&
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
