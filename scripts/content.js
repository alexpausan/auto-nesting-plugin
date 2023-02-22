// Parsing all the html

setTimeout(getDOMData, 2000)

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
}

const CONTENT_TAGS = {
  P: true,
  H1: true,
  H2: true,
  H3: true,
  H4: true,
  H5: true,
  H6: true,
  A: true,
  SPAN: true,
  LABEL: true,
  STRONG: true,
  EM: true,
  IMG: true,
  SVG: true,
  svg: true,
  BUTTON: true,
  INPUT: true,
  AUDIO: true,
  VIDEO: true,
}

const MEDIA_TAGS = {
  IMG: true,
  SVG: true,
  svg: true,
  AUDIO: true,
  VIDEO: true,
}

const CONTENT_TYPE = {
  EMPTY: 'EMPTY',
  TEXT: 'TEXT',
  TEXT_AND_TAGS: 'TEXT_AND_TAGS',
  TAGS: 'TAGS',
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

const ORIENTATION_COLOR = {
  [ORIENTATION.ROW]: 'rgba(255, 0, 0, 0.6)',
  [ORIENTATION.ROW_WR]: 'magenta',
  [ORIENTATION.COL]: 'rgba(0, 255, 255, 0.7)',
  [ORIENTATION.COL_WR]: 'pink',
  [ORIENTATION.GRID]: 'green',
  [ORIENTATION.BLOCK_INLINE]: 'yellow',
  [ORIENTATION.NOT_ALIGNED]: 'black',
}

const MUTATE_HTML = false

let docHeight
let docWidth

let tree = {}

function getDOMData() {
  const t0 = performance.now()
  const body = document.body

  docHeight = body.scrollHeight
  docWidth = body.scrollWidth

  let result = getSimplifiedTree(body)
  result = cleanContentNodes(result)

  console.log(result)

  const t1 = performance.now()
  console.log(t1 - t0, 'milliseconds')
}

function getSimplifiedTree(element) {
  let { children, tagName: elTagName } = element

  // TODO move the classes from the removed elements to the kept element
  // Omit div in div, until we find a container with multiple children or we reach a content element
  children = getContainerWithMultipleChildrenOrContent(element)

  if (!children.length) {
    return {
      element,
      children: null,
    }
  }

  // Update the result with the new element and and make the children an array
  const result = {
    element,
    children: [],
  }

  children.forEach((child) => {
    result.children.push(getSimplifiedTree(child))
  })

  return result
}

function cleanContentNodes(node) {
  let { element, children } = node
  const { tagName: elTagName } = element

  const result = {
    element,
    children: [],
  }

  if (elTagName === 'svg') {
    result.children = children

    return result
  }

  // In case we don't have any valid children, but the element has other HTML children
  // We replace the children with the innerText of the element
  if (!children?.length) {
    // In case we have a
    if (CONTENT_TAGS[elTagName] && element.innerText?.trim()) {
      // element.innerHTML = `${element.innerText?.trim()}`
    }

    return {
      ...result,
      children: null,
    }
  }

  if (CONTENT_TAGS[elTagName]) {
    const childElement = children[0].element

    if (children.length === 1 && isChildRedundant(element, childElement)) {
      // element.innerHTML = `${childElement?.innerText?.trim()}`

      return {
        ...result,
        children: null,
      }
    }

    // In case the element is a Content tag with one or multiple children, we stop here
    return {
      ...result,
      children,
    }
  }

  // We add the orientation property to each container element
  if (CONTAINER_TAGS[elTagName]) {
    result.orientation = getOrientation(children)
    // Mark it for testing purposes
    element.style.outline = '4px solid ' + ORIENTATION_COLOR[result.orientation]
    element.style.outlineOffset = result.orientation === ORIENTATION.ROW ? '-3px' : '0px'
  }

  children.forEach((child) => {
    if (!child || !child.element) {
      return
    }
    result.children.push(cleanContentNodes(child))
  })

  return result
}

function filterChildrenToCriteria(children) {
  const parentTagName = children[0]?.parentElement?.tagName || ''

  return children.filter((child) => {
    if (isNotVisible(child)) {
      MUTATE_HTML && child.remove()
      return
    }

    if (hasAbsolutePosition(child)) {
      MUTATE_HTML && child.remove()
      return
    }

    // // Filter divs or other containers that are inside content tags
    if (CONTENT_TAGS[parentTagName] && CONTAINER_TAGS[child.tagName]) {
      // child.remove()
      return
    }

    // Filter any other type of element, except content or container tags
    if (!CONTAINER_TAGS[child.tagName] && !CONTENT_TAGS[child.tagName]) {
      // child.remove()
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
  const parentElement = elementList[0].element.parentElement
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
  const orientationBasedOnPosition = getOrientationBasedOnPosition(elementList, parentDisplay)
  if (orientationBasedOnPosition !== ORIENTATION.NOT_ALIGNED) {
    return orientationBasedOnPosition
  }

  // If the parent has grid display, and does not fit a row or column pattern, we return grid
  // TO DO: experiment with returning grid earlier ->before the orientation based on position
  if (parentDisplay === 'grid') {
    return ORIENTATION.GRID
  }

  console.log('--- NOT ALIGNED---- ', elementList[0].element.parentElement)

  return ORIENTATION.NOT_ALIGNED
}
// Will move the data
function enrichData2(navs) {
  const newData = navs.map((nav) => {
    let { rect, input, ...rest } = nav

    const deltaX1 = []
    const deltaX2 = []
    const deltaX3 = []
    const deltaY1 = []
    const deltaY2 = []
    const deltaY3 = []
    const deltaX1_Y1 = []
    const deltaX1_Y2 = []
    const deltaX1_Y3 = []
    const deltaX2_Y1 = []
    const deltaX2_Y2 = []
    const deltaX2_Y3 = []
    const deltaX3_Y1 = []
    const deltaX3_Y2 = []
    const deltaX3_Y3 = []

    if (rect.length) {
      rect.forEach((item) => {
        // Change position on the X axis
        let newX1 = item.x + getRandomInt(SPACE_UNIT)
        let newX2 = item.x + getRandomInt(SPACE_UNIT * 0.75)
        let newX3 = item.x + getRandomInt(SPACE_UNIT / 2)

        // Change position on the Y axis
        let newY1 = item.x + getRandomInt(SPACE_UNIT)
        let newY2 = item.x + getRandomInt(SPACE_UNIT * 0.75)
        let newY3 = item.x + getRandomInt(SPACE_UNIT / 2)

        deltaX1.push({ ...item, x: newX1 })
        deltaX2.push({ ...item, x: newX2 })
        deltaX3.push({ ...item, x: newX3 })
        deltaY1.push({ ...item, y: newY1 })
        deltaY2.push({ ...item, y: newY1 })
        deltaY3.push({ ...item, y: newY1 })
        deltaX1_Y1.push({ ...item, x: newX1, y: newY1 })
        deltaX1_Y2.push({ ...item, x: newX1, y: newY2 })
        deltaX1_Y3.push({ ...item, x: newX1, y: newY3 })
        deltaX2_Y1.push({ ...item, x: newX2, y: newY1 })
        deltaX2_Y2.push({ ...item, x: newX2, y: newY2 })
        deltaX2_Y3.push({ ...item, x: newX2, y: newY3 })
        deltaX3_Y1.push({ ...item, x: newX3, y: newY1 })
        deltaX3_Y2.push({ ...item, x: newX3, y: newY2 })
        deltaX3_Y3.push({ ...item, x: newX3, y: newY3 })
      })
    }
    input.push(JSON.stringify(deltaX1).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX2).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX3).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaY1).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaY2).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaY3).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX1_Y1).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX1_Y2).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX1_Y3).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX2_Y1).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX2_Y2).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX2_Y3).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX3_Y1).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX3_Y2).replace(REGEX.DOUBLE_QUOTES, ''))
    input.push(JSON.stringify(deltaX3_Y3).replace(REGEX.DOUBLE_QUOTES, ''))

    return {
      ...rest,
      input,
      rect,
    }
  })

  return newData
}

function getRandomInt(delta = SPACE_UNIT) {
  const min = Math.ceil(-delta)
  const max = Math.floor(delta)

  return Math.floor(Math.random() * (max - min) + min)
}

function hasAbsolutePosition(element) {
  while (element && element !== document.body) {
    let style = window.getComputedStyle(element)
    if (style.position === 'absolute') {
      return true
    }

    element = element.parentElement
  }

  return false
}

function isNotVisible(element) {
  const styles = window.getComputedStyle(element)
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
    height: rect.height,
    width: rect.width,
    x: rect.x + window.pageXOffset,
    y: rect.y + window.pageYOffset,
    top: rect.top + window.pageYOffset,
    bottom: rect.bottom + window.pageYOffset,
    left: rect.left + window.pageXOffset,
    right: rect.right + window.pageXOffset,
  }
}

function isChildRedundant(element, child = {}) {
  // There may be cases where an anchor tag has a child that is not a text node
  if (element?.innerText?.trim() === child?.innerText?.trim() && !hasMediaElement(element)) {
    return true
  }

  return false
}

function getRandomColor() {
  let letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

function hasBackgroundOrBorder(element) {
  const styles = window.getComputedStyle(element)

  const hasBorder = styles.borderStyle !== 'none'
  const hasBackground =
    styles.backgroundColor !== 'rgba(0, 0, 0, 0)' || styles.backgroundImage !== 'none'

  return hasBorder || hasBackground
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

function hasMediaElement(anchorTag) {
  const innerHTML = anchorTag.innerHTML
  const mediaRegex = /<audio|video|img|svg/gi
  return mediaRegex.test(innerHTML)
}

// We try to calculate the orientation based on elements' position
function getOrientationBasedOnPosition(elementList, parentDisplay) {
  const topValues = []
  const bottomValues = []
  const leftValues = []
  const rightValues = []
  const hCenter = []
  const vCenter = []
  let allElementsAreInline = true

  for (let i = 0; i < elementList.length; i++) {
    const currentEl = elementList[i].element
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

    hCenter.push(rect.left + rect.width / 2)
    vCenter.push(rect.top + rect.height / 2)
  }

  // We use the default sort method, and compare the nr
  topValues.sort((a, b) => a - b)
  bottomValues.sort((a, b) => a - b)
  leftValues.sort((a, b) => a - b)
  rightValues.sort((a, b) => a - b)
  hCenter.sort((a, b) => a - b)
  vCenter.sort((a, b) => a - b)

  // Get the max difference in each case
  const topDiff = topValues[topValues.length - 1] - topValues[0]
  const bottomDiff = bottomValues[bottomValues.length - 1] - bottomValues[0]
  const leftDiff = leftValues[leftValues.length - 1] - leftValues[0]
  const rightDiff = rightValues[rightValues.length - 1] - rightValues[0]
  const hDiff = hCenter[hCenter.length - 1] - hCenter[0]
  const vDiff = vCenter[vCenter.length - 1] - vCenter[0]

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
    vDiff < hDiff * ORIENTATION_THRESHOLD &&
    !arrayHasDuplicates(leftValues) &&
    !arrayHasDuplicates(rightValues)
  ) {
    // If elements are aligned in a row, but the parent is grid, we mimic a row wrap
    if (parentDisplay === 'grid') {
      console.log('GRID  ->>> ROW', elementList[0].element.parentElement)
      return ORIENTATION.ROW_WR
    }

    return ORIENTATION.ROW
  }

  if (
    vDiff * ORIENTATION_THRESHOLD > hDiff &&
    !arrayHasDuplicates(topValues) &&
    !arrayHasDuplicates(bottomValues)
  ) {
    return ORIENTATION.COLUMN
  }

  // There are cases where multiple text elements are used inside a container, and they may not be aligned
  if (parentDisplay === 'block' && allElementsAreInline) {
    return ORIENTATION.BLOCK_INLINE
  }

  return ORIENTATION.NOT_ALIGNED
}
