let docHeight
let docWidth

function getDOMData() {
  const body = document.body

  docHeight = body.scrollHeight
  docWidth = body.scrollWidth

  let result = getTreeData(body)

  return result
}

function getTreeData(treeNode) {
  // Omit div in div, until we find a container with multiple children or we reach a content node
  let { node, children } = getContainerWithMultipleChildrenOrContent(treeNode)

  // We skip divs without children and who are either Not visible or not Slot elements (absolute children)
  if (CONTAINER_TAGS[node.nodeName] && !children?.length) {
    if (!divHasVisibleBackgroundOrBorder(node) && !hasAbsoluteChild(node)) {
      return null
    }
  }

  let { nodeName } = node
  const nodeRect = getNodeRect(node)
  const { top, left, width, height } = addOffsetToRect(nodeRect)

  const result = {
    node,
    nodeName,
    rect: { top, left, width, height },
    styles: getCSSProperties(node, nodeName),
    classList: getNodeClassList(node, nodeName),
  }

  if (!children?.length) {
    return result
  }

  if (CONTENT_TAGS[nodeName]) {
    if (nodeName === NODE_NAME.INPUT) {
      return {
        ...result,
        type: node.type,
      }
    }

    if (nodeName !== NODE_NAME.ANCHOR) {
      return result
    }

    if (children?.length === 1 && isChildRedundant(node, children[0])) {
      return result
    }
  }

  // Mark it for testing purposes
  if (children?.length > 1) {
    const orientation = getOrientation(children)
    result.orientation = orientation

    // TODO comment when scraping - > Mark it for testing purposes
    node.style.outline = '4px dashed ' + ORIENTATION_COLOR[orientation]
    node.style.outlineOffset = '-4px'
  }

  result.children = []

  children.forEach((child) => {
    const childData = getTreeData(child)
    if (childData) {
      result.children.push(childData)
    }
  })

  return result
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

function getCSSProperties(node, nodeName) {
  if (nodeName === NODE_NAME.TEXT) {
    const parentStyles = getComputedStyle(node.parentNode)
    const fontSizeProp = STYLE_PROPERTIES.TEXT_NODES

    return {
      [fontSizeProp]: parentStyles.getPropertyValue(fontSizeProp),
      position: 'static',
      display: 'inline',
    }
  }

  const styles = {}

  const computedStyles = getComputedStyle(node)
  const display = computedStyles.getPropertyValue('display').trim()

  let properties = STYLE_PROPERTIES.COMMON

  if (display === DISPLAY_FLEX) {
    properties = properties.concat(STYLE_PROPERTIES.FLEX)
  }

  if (display === DISPLAY_GRID) {
    properties = properties.concat(STYLE_PROPERTIES.GRID)
  }

  if (CONTAINER_TAGS[nodeName]) {
    properties = properties.concat(STYLE_PROPERTIES.CONTAINER)
  }

  for (const property of properties) {
    const propertyValue = computedStyles.getPropertyValue(property).trim()
    const defaultValue = DEFAULT_STYLES[property]

    if (propertyValue && propertyValue !== defaultValue) {
      styles[property] = propertyValue
    }
  }

  return styles
}

function getNodeClassList(node, nodeName) {
  if (nodeName === NODE_NAME.TEXT) {
    return ''
  }

  return Array.from(node.classList)?.join(' ')?.substring(0, 50)
}

// If we have DIV IN DIV, we skip the intermediate divs, until we find a container with multiple
// children or we reach the content
function getContainerWithMultipleChildrenOrContent(node) {
  let { childNodes, nodeName } = node

  if (nodeName === NODE_NAME.TEXT) {
    return { node }
  }

  let children = filterChildrenToCriteria(Array.from(childNodes))

  if (!children?.length) {
    return { node }
  }

  if (CONTENT_TAGS[nodeName]) {
    return {
      node,
      children,
    }
  }

  // If the node is a container with only one child, we continue
  if (CONTAINER_TAGS[nodeName] && children?.length === 1) {
    return getContainerWithMultipleChildrenOrContent(children[0])
  }

  return {
    node,
    children,
  }
}

// Only for scraping
function filterChildrenToCriteria(childNodes = []) {
  return childNodes.filter((child) => {
    const { nodeName, parentNode, childNodes } = child

    if (nodeName === NODE_NAME.TEXT) {
      return CONTAINER_TAGS[parentNode.nodeName] ? child.textContent.trim().length : false
    }

    // Check content elements are visible
    if (CONTENT_TAGS[nodeName]) {
      return isElementVisibleAndInViewport(child) && !hasAbsolutePosition(child)
    }

    if (CONTAINER_TAGS[nodeName]) {
      return (
        isElementVisibleAndInViewport(child) &&
        !hasAbsolutePosition(child) &&
        (childNodes?.length || divHasVisibleBackgroundOrBorder(child))
      )
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

  if (parentDisplay === DISPLAY_FLEX) {
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

  const xEdges = []
  const yEdges = []

  let allElementsAreInline = true

  for (let i = 0; i < nodesList.length; i++) {
    const node = nodesList[i]
    const rect = getNodeRect(node)

    const { top, bottom, left, right, width, height } = rect

    topValues.push(top)
    bottomValues.push(bottom)
    leftValues.push(left)
    rightValues.push(right)

    horizontalPosOfCenter.push(left + width / 2)
    verticalPosOfCenter.push(top + height / 2)

    xEdges.push(left, right)
    yEdges.push(top, bottom)

    const currentNodeStyle = getNodeStyles(node)
    const currentNodeDisplay = currentNodeStyle.display

    if (currentNodeDisplay !== 'inline' && currentNodeDisplay !== 'inline-block') {
      allElementsAreInline = false
    }
  }

  const payload = {
    topValues,
    bottomValues,
    leftValues,
    rightValues,
    horizontalPosOfCenter,
    verticalPosOfCenter,
    parentDisplay,
    allElementsAreInline,
    xEdges,
    yEdges,
    nodesList,
  }

  return getOrientationBasedOnRects(payload)
}

function getOrientationBasedOnRects(props, tryNr = 0) {
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
    xEdges,
    yEdges,
  } = props

  // Check if xEdges and yEdges are ascending or descending, while not having duplicates on the opposite axis
  if (
    isArrayAscendingOrDescending(xEdges) &&
    !arrayHasDuplicates(leftValues) &&
    !arrayHasDuplicates(rightValues)
  ) {
    return ORIENTATION.ROW
  }

  if (
    isArrayAscendingOrDescending(yEdges) &&
    !arrayHasDuplicates(topValues) &&
    !arrayHasDuplicates(bottomValues)
  ) {
    return ORIENTATION.COL
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

  // If still not aligned, we call the function again, with a higher tolerance
  if (tryNr === 0) {
    props.alignmentTolerance = ALIGNMENT_TOLERANCE * 2
    return getOrientationBasedOnRects(props, ++tryNr)
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

function isElementVisibleAndInViewport(node) {
  // We exclude text nodes that have no content
  if (node.nodeName === NODE_NAME.TEXT && !node.textContent.trim()) {
    return false
  }

  const styles = getNodeStyles(node)
  const rect = getNodeRect(node)
  const offsetRect = addOffsetToRect(rect)
  const { display, visibility, transform } = styles

  // We include the ones that have display contents
  if (display === 'contents') {
    node.style.display = DISPLAY_FLEX
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
    visibility !== 'hidden' &&
    transform === 'none'
  ) {
    return true
  }
}

function isChildRedundant(element, child = {}) {
  const childText =
    child.nodeName === NODE_NAME.TEXT
      ? child?.textContent?.trim().toLowerCase()
      : child?.innerText?.trim().toLowerCase()

  const elementText = element?.innerText?.trim().toLowerCase()

  // There may be cases where an anchor tag has a child that is not a text node
  if (elementText === childText && !anchorWithMediaElement(element)) {
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

function anchorWithMediaElement(element) {
  const nodeName = element.nodeName
  const innerHTML = element.innerHTML
  const mediaRegex = /<(?:audio|video|img|svg|picture|canvas|map)\b/gi

  return nodeName === NODE_NAME.ANCHOR && mediaRegex.test(innerHTML)
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

function divHasVisibleBackgroundOrBorder(node) {
  const style = getComputedStyle(node)

  const hasVisibleBorder = style.borderStyle !== 'none' && style.borderWidth !== '0px'
  const hasVisibleOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px'
  const hasVisibleBoxShadow = style.boxShadow !== 'none'
  const hasBackgroundImage = style.backgroundImage !== 'none'
  const hasVisibleBackground =
    style.backgroundColor !== 'transparent' && style.backgroundColor !== 'rgba(0, 0, 0, 0)'

  return (
    hasVisibleBorder ||
    hasVisibleOutline ||
    hasVisibleBoxShadow ||
    hasBackgroundImage ||
    hasVisibleBackground
  )
}

function hasAbsoluteChild(node) {
  for (const child of node.children) {
    const style = window.getComputedStyle(child)
    if (style.position === 'absolute') {
      return true
    }

    if (hasAbsoluteChild(child)) {
      return true
    }
  }

  return false
}

function isArrayAscendingOrDescending(arr) {
  let ascending = true
  let descending = true

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) {
      ascending = false
    }
    if (arr[i] > arr[i - 1]) {
      descending = false
    }

    if (!ascending && !descending) {
      return false
    }
  }

  return ascending || descending
}
