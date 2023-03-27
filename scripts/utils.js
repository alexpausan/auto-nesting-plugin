function computeContainersRectAndOrientation(node = {}) {
  let { type, rect, children } = node
  let result = { ...node }

  const topValues = []
  const bottomValues = []
  const leftValues = []
  const rightValues = []
  const horizontalPosOfCenter = []
  const verticalPosOfCenter = []

  const xEdges = []
  const yEdges = []

  if (children?.length) {
    const childrenRects = children.map(computeContainersRectAndOrientation)

    for (let i = 0; i < childrenRects.length; i++) {
      const childRect = childrenRects[i]

      const { top, left, width, height } = childRect.rect
      const bottom = top + height
      const right = left + width

      topValues.push(top)
      bottomValues.push(bottom)
      leftValues.push(left)
      rightValues.push(right)

      verticalPosOfCenter.push(top + height / 2)
      horizontalPosOfCenter.push(left + width / 2)

      yEdges.push(top, bottom)
      xEdges.push(left, right)
    }

    // First we get all the edges of the children, then we sort them
    topValues.sort((a, b) => a - b)
    bottomValues.sort((a, b) => a - b)
    leftValues.sort((a, b) => a - b)
    rightValues.sort((a, b) => a - b)

    // Top and Left are the smallest values of the children,
    // Width and Height are the difference between the biggest right/bottom and the smallest top/left
    let minTop = topValues[0]
    let minLeft = leftValues[0]
    let maxHeight = bottomValues[bottomValues.length - 1] - minTop
    let maxWidth = rightValues[rightValues.length - 1] - minLeft

    const payload = {
      topValues,
      leftValues,
      bottomValues,
      rightValues,
      horizontalPosOfCenter,
      verticalPosOfCenter,
      xEdges,
      yEdges,
    }

    const orientation = children?.length > 1 ? getOrientationBasedOnRects(payload) : null

    // It's quite common for Anchor elements to have children bigger than themself
    if (type === LINK_ELEMENT) {
      const { top, left, width, height } = rect

      minTop = minTop < top ? minTop : top
      minLeft = minLeft < left ? minLeft : left
      maxHeight = maxHeight > height ? maxHeight : height
      maxWidth = maxWidth > width ? maxWidth : width
    }

    rect = {
      top: minTop,
      left: minLeft,
      height: maxHeight,
      width: maxWidth,
    }

    result.rect = rect
    result.orientation = orientation
  }

  return result
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
