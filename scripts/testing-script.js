const TOP_PROP_LENGHT = 3
const LEFT_PROP_LENGHT = 4
const WIDTH_PROP_LENGHT = 5
const HEIGHT_PROP_LENGHT = 6

const DIV_START = /^\[div/
const PARENT_END = /^\]/
const ELEMENT_END = /^\]/
const DIV_PATERN_LENGTH = 4
const ELEMENT_CONTENT =
  /^\[(\w+)(?:\s*(?:top)?(\d+)\s*(?:left)?(\d+)\s*(?:height)?(\d+)\s*(?:width)?(\d+))/

const DIV_ELEMENT = 'div'
const LINK_ELEMENT = 'link'
const SIZES = {
  UNIT: 16,
  QUARTER: 4,
  HALF: 8,
  THREE_QUARTERS: 12,
  ONE_AND_HALF: 24,
  DOUBLE: 32,
  TRIPLE: 48,
  QUADRUPLE: 64,
  QUINTUPLE: 80,
  SEXTUPLE: 96,
}

const GAP_TOLLERANCE = 5
const TEXT_SPACING_TOLLERANCE = 8
const TEXT_ELEMENT = {
  text: true,
  heading: true,
  link: true,
}

async function getGPTResponse(trainingData, model) {
  if (!trainingData) {
    return
  }

  createOverlaysContainer()

  const t0 = performance.now()
  const messages = [SYSTEM_MESSAGE]

  trainingData.forEach((item) => {
    if (!item.prompt) {
      return
    }
    messages.push({ role: 'user', content: item.prompt })
  })

  const payload = {
    model,
    messages,
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer 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',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!data?.choices) {
      return ''
    }

    const { choices = [] } = data
    let text = choices[0]?.message?.content

    processOpenAIResponse(text)

    return text
  } catch (error) {
    console.error(error)
  }

  const t1 = performance.now()
  console.log(t1 - t0, 'milliseconds')
}

async function callAPIForNestedStructure(flatStructure, model, version) {
  if (!flatStructure) {
    return
  }

  const t0 = performance.now()
  const promises = []

  const payload = {
    model,
    temperature: 0,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop: ['}]} END'],
  }

  flatStructure.forEach((item) => {
    if (!item.prompt) {
      return
    }

    const promise = new Promise(async (resolve) => {
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
        .then((response) => {
          if (!response?.choices) {
            resolve()
          }

          const { choices = [] } = response
          const { text = '' } = choices[0]
          const treeResult = processOpenAIResponse(text, version)

          resolve(treeResult)
        })
        .catch((error) => console.error(error))
    })

    promises.push(promise)
  })

  const allResponses = await Promise.all(promises)

  const t1 = performance.now()
  console.log(t1 - t0, 'milliseconds')

  return allResponses
}

function processOpenAIResponse(text, version) {
  if (!text.length) {
    return
  }

  text = text.trim() + '}]}'
  let tree = parseStringToTree(text, version)

  return tree
}

function buildContainerDataAndOrientation(nodeList) {
  // console.log({ text }, tree)
  if (!nodeList?.length) {
    return
  }

  try {
    return nodeList.map((node) => {
      const updatedNode = computeContainersRectAndOrientation(node)
      buildAbsoluteOverlay(updatedNode)

      return updatedNode
    })
  } catch (error) {
    console.error(error)
  }
}

function buildAbsoluteOverlay(node) {
  if (!node) {
    return
  }

  let { rect, children, orientation } = node

  if (children?.length && rect) {
    addAbsOverlay(rect, orientation)
  }

  if (children?.length) {
    children.forEach(buildAbsoluteOverlay)
  }
}

function addAbsOverlay(rect, orientation) {
  const el = document.createElement('div')
  el.classList.add('nesting-overlay')
  el.style.cssText = `
    position: absolute;
    border: 4px dashed ${ORIENTATION_COLOR[orientation]};
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    z-index: 99000;
    visibility: visible;
  `

  const overlayContainer = document.getElementById('nesting-overlay-container')
  overlayContainer.appendChild(el)
}

function parseStringToTree(string, version = 'v14') {
  const preparedString = string
    .replace(/{/g, '{"')
    .replace(/:/g, '":"')
    .replace(/,/g, '","')
    .replace(/"\[/g, '[')
    .replace(/}{/g, '},{')
    .replace(/}/g, '"}')
    .replace(/]"}/g, ']}')

  try {
    const tree = JSON.parse(preparedString)
    return formatTree(tree)
  } catch (error) {
    console.log(error, preparedString)
    try {
      const tree = JSON.parse(preparedString)
      return formatTree(tree + ']}')
    } catch (error) {
      console.log(error, preparedString)
    }
  }
}

function formatTree(tree = {}) {
  if (!tree) {
    return
  }

  const { type, children } = tree

  if (type !== DIV_ELEMENT) {
    const { top, left, height, width } = tree

    tree = {
      type,
      rect: {
        top: parseInt(top),
        left: parseInt(left),
        height: parseInt(height),
        width: parseInt(width),
      },
    }
  }
  if (!children?.length) {
    return tree
  }

  tree.children = children.map((child) => formatTree(child))

  return tree
}

function stringToTree(data, includeAllCoordinates = false) {
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
          console.info('ERROR - data generation')
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

    let match = currentText.match(ELEMENT_CONTENT)
    if (!match) {
      console.log('ERROR - data generation', root, currentNode)
      console.log(currentText)
      console.log(data)
    }
    match = match || []
    const elementType = match[1]

    const newNode = {
      type: elementType,
      rect: getNodeRectFromString(match),
    }

    if (!match) {
      return null
    }

    index += match[0].length
    currentText = currentText.substring(match[0].length)

    if (!currentNode) {
      currentNode = root
      console.info('ERR - 222  - data generation')
    }

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

function getNodeRectFromString(match = []) {
  const top = parseInt(match[2], 10)
  const left = parseInt(match[3], 10)
  const height = parseInt(match[4], 10)
  const width = parseInt(match[5], 10)

  return {
    top,
    left,
    height,
    width,
  }
}

function rebuildPrompt(node = {}, onlyOneLevel = true, level = 0) {
  const { children, rect, type: elType } = node
  const rectData = rect ? getRectData(rect) : ''

  let result = elType !== DIV_LABELS.DIV && rect ? `[${elType} ${rectData}]` : NO_DATA

  if (!children?.length) {
    return result
  }

  if (elType !== DIV_LABELS.DIV && elType !== CONTENT_TAG_LABEL.A) {
    return result
  }

  if (onlyOneLevel && level > 0) {
    return result
  }

  let childrenData = ''
  children.forEach((child) => {
    childrenData += rebuildPrompt(child, onlyOneLevel, level + 1)
  })

  return result + childrenData
}

function computeContainersRectAndOrientation(node = {}) {
  let { children } = node

  if (children?.length) {
    const childrenRects = children.map(computeContainersRectAndOrientation)

    const childrenCoord = getChildrenCoordinates(childrenRects)

    const parentCoordinates = getParentCoordinates(childrenCoord, node)
    const orientation = children?.length > 1 ? getOrientationBasedOnRects(childrenCoord) : null

    if (orientation && orientation === ORIENTATION.NOT_ALIGNED) {
      // TODO: First check if GRID, or inline, if neither, then make a new API call
      const newPrompt = rebuildPrompt(node)

      console.log('NOT ALIGNED', node, newPrompt)
    }

    // In checking the gaps between the children, we can identify if the nesting was done correctly
    // const { flexProps, newGroups } = getFlexPropsOrNewGroups(node, childrenRects, orientation)

    // if (newGroups) {
    //   if (newGroups.length === 2) {
    //     const [firstGroup, secondGroup] = newGroups

    //     const groupToBeWrapped = firstGroup.length > 1 ? firstGroup : secondGroup
    //     const individualItem = firstGroup.length === 1 ? firstGroup[0] : secondGroup[0]

    //     let newContainerNode = {
    //       type: 'div',
    //       children: groupToBeWrapped,
    //     }

    //     newContainerNode = computeContainersRectAndOrientation(newContainerNode)

    //     const newContainerOrientation = newContainerNode.orientation
    //     const directionProp = newContainerOrientation === ORIENTATION.ROW ? 'left' : 'top'

    //     node.children = [newContainerNode, individualItem].sort(
    //       (a, b) => a.rect[directionProp] - b.rect[directionProp]
    //     )
    //     console.log(node)
    //   } else {
    //     // TODO: Make a new API call
    //   }
    // }

    // if (flexProps) {
    //   node.flexProps = flexProps
    // }

    node.rect = parentCoordinates
    node.orientation = orientation
  }

  return node
}

function getFlexPropsOrNewGroups(node, childrenRects, orientation) {
  if (!orientation || orientation === ORIENTATION.NOT_ALIGNED) {
    return {}
  }

  const directionProp = orientation === ORIENTATION.ROW ? 'left' : 'top'
  const sizeProp = orientation === ORIENTATION.ROW ? 'width' : 'height'

  const childGaps = {}
  const directionCoordDiffs = {}

  let childrenTotalSizeWithGap = 0
  let allChildrenAreText = true

  childrenRects.sort((a, b) => a.rect[directionProp] - b.rect[directionProp])

  let prevGap
  let prevDiff

  for (let i = 0, len = childrenRects.length; i < len - 1; i++) {
    const currentChild = childrenRects[i]
    const nextChild = childrenRects[i + 1]

    const currentChildCoordinate = currentChild.rect[directionProp]
    const nextChildCoordinate = nextChild.rect[directionProp]
    const currentChildSize = currentChild.rect[sizeProp]

    const gap = nextChildCoordinate - (currentChildCoordinate + currentChildSize)
    const coordDiff = nextChildCoordinate - currentChildCoordinate

    if (!prevGap) {
      prevGap = gap
      prevDiff = coordDiff
      childGaps[gap] = [currentChild]
      directionCoordDiffs[coordDiff] = [currentChild]

      continue
    }

    if (numbersAreAproxEqual(gap, prevGap, GAP_TOLLERANCE)) {
      childGaps[prevGap].push(currentChild)
    } else {
      if (gap > prevGap) {
        childGaps[prevGap].push(currentChild)
        childGaps[gap] = []
      } else {
        childGaps[gap] = [currentChild]
      }
      prevGap = gap
    }

    if (numbersAreAproxEqual(coordDiff, prevDiff, GAP_TOLLERANCE)) {
      directionCoordDiffs[prevDiff].push(currentChild)
    } else {
      if (coordDiff > prevDiff) {
        directionCoordDiffs[prevDiff].push(currentChild)
        directionCoordDiffs[coordDiff] = []
      } else {
        directionCoordDiffs[coordDiff] = [currentChild]
      }
      prevDiff = coordDiff
    }

    childrenTotalSizeWithGap += currentChildSize + gap

    // Add the last child size to the total size and the last child to the gaps and diffs
    if (i === len - 2) {
      childGaps[prevGap].push(nextChild)
      directionCoordDiffs[prevDiff].push(nextChild)

      const lastChildSize = nextChild.rect[sizeProp]
      childrenTotalSizeWithGap += lastChildSize
    }

    if (!TEXT_ELEMENT[currentChild.type]) {
      allChildrenAreText = false
    }
  }

  const gapKeys = Object.keys(childGaps)
  const directionCoordKeys = Object.keys(directionCoordDiffs)

  if (allChildrenAreText) {
    if (textGapsAreSmallerThanTolerance(childGaps)) {
      return {
        flexProps: {
          gap: gapKeys.length === 1 ? gapKeys[0] : 0,
          justifyContent: 'flex-start',
        },
      }
    }
  }

  if (gapKeys.length === 1) {
    return {
      flexProps: { gap: gapKeys[0] },
    }
  }
  if (directionCoordKeys.length === 1) {
    return {
      flexProps: { justifyContent: 'space-between' },
    }
  }

  if (gapKeys.length === 2 || directionCoordKeys.length === 2) {
    const newGroups = gapKeys.length === 2 ? childGaps : directionCoordDiffs
    return { newGroups: Object.values(newGroups) }
  }

  console.log('New API Call --- ', childGaps, directionCoordDiffs)

  const newGroups = gapKeys.length < directionCoordKeys.length ? childGaps : directionCoordDiffs
  return { newGroups: Object.values(newGroups) }
}

function numbersAreAproxEqual(a, b, tolerance = 0) {
  return Math.abs(a - b) <= tolerance
}

function textGapsAreSmallerThanTolerance(gapValues, tolerance = TEXT_SPACING_TOLLERANCE) {
  return Object.keys(gapValues).every((value) => value < tolerance)
}

function getChildrenCoordinates(children) {
  const topValues = []
  const bottomValues = []
  const leftValues = []
  const rightValues = []
  const horizontalPosOfCenter = []
  const verticalPosOfCenter = []

  const xEdges = []
  const yEdges = []

  for (let i = 0; i < children.length; i++) {
    const child = children[i]

    const { top, left, width, height } = child.rect
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

  return {
    topValues,
    leftValues,
    bottomValues,
    rightValues,
    horizontalPosOfCenter,
    verticalPosOfCenter,
    yEdges,
    xEdges,
  }
}

function getParentCoordinates(childrenCoordinates, node) {
  const { topValues, bottomValues, leftValues, rightValues } = childrenCoordinates
  const { type, rect } = node

  // Top and Left are the smallest values of the children,
  // Width and Height are the difference between the biggest right/bottom and the smallest top/left
  let minTop = topValues[0]
  let minLeft = leftValues[0]
  let maxHeight = bottomValues[bottomValues.length - 1] - minTop
  let maxWidth = rightValues[rightValues.length - 1] - minLeft

  // It's quite common for Anchor elements to have children bigger than themself
  if (type === LINK_ELEMENT) {
    const { top, left, width, height } = rect

    minTop = minTop < top ? minTop : top
    minLeft = minLeft < left ? minLeft : left
    maxHeight = maxHeight > height ? maxHeight : height
    maxWidth = maxWidth > width ? maxWidth : width
  }

  return {
    top: minTop,
    left: minLeft,
    height: maxHeight,
    width: maxWidth,
  }
}

function markForTesting({ node, hideElement = false } = {}) {
  let { nodeName, node: domNode } = node

  // If it's a #text node we need to get the parent
  domNode = nodeName === NODE_NAME.TEXT ? domNode.parentElement : domNode

  if (!domNode) {
    return
  }

  if (hideElement) {
    domNode.style.visibility = 'hidden'
    return
  }

  domNode.style.borderColor = 'transparent'
  domNode.style.visibility = 'visible'

  domNode.style.background = 'rgba(0, 0, 0, 0.1)'
  // We hide the container elements
}
