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

const COMPLETION_CLOSING = '}]}'

const retried_prompts = []

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

async function makeOpenAICall({ model, prompt, callback, version = 'v17' }) {
  model = model || 'babbage:ft-personal:2404-v17-2023-04-25-12-42-32'

  const payload = {
    prompt,
    model,
    temperature: 0,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop: [`${COMPLETION_CLOSING} ${GPT_END_OF_COMPLETION}`],
  }

  return fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer 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',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.json())
    .then(callback)
    .catch((error) => console.error(error))
}

async function callAPIForNestedStructure(flatStructure, model, version = 'v17') {
  if (!flatStructure) {
    return
  }

  const t0 = performance.now()
  const response = await Promise.all(
    flatStructure.map(async (item) =>
      makeOpenAICall({ model, prompt: item.prompt, callback: processOpenAIResponse })
    )
  )
  console.log(response)

  const t1 = performance.now()
  console.log(t1 - t0, 'milliseconds')

  return response
}

async function processOpenAIResponse(response) {
  if (!response?.choices) {
    return
  }

  const { choices = [] } = response
  let { text = '' } = choices[0]

  if (!text.length) {
    return
  }

  text = text.trim() + COMPLETION_CLOSING
  let tree = parseStringToTree(text)

  tree = await computeContainersRectAndOrientation(tree, true)

  return tree
}

function secondCheckForAlignment(nodeList) {}

function buildAbsoluteOverlay(node) {
  if (!node) {
    return
  }

  let { rect, children, orientation, type } = node

  if ((children?.length || type === DIV_LABELS.SLOT) && rect) {
    addAbsOverlay(rect, orientation, type)
  }

  if (children?.length) {
    children.forEach(buildAbsoluteOverlay)
  }
}

function toggleLoadingOverlay(rect) {
  const { top, left, width, height } = rect
  const id = `loading-${top}-${left}-${width}-${height}`

  const loadingOverlay = document.getElementById(id)

  if (loadingOverlay) {
    loadingOverlay.remove()
    return
  }

  const el = document.createElement('div')

  el.id = id
  el.style.cssText = `
    position: absolute;
    top: ${top}px;
    left: ${left}px;
    width: ${width}px;
    height: ${height}px;
    z-index: 99000;
    visibility: visible;
    background-color: rgba(255, 255, 255, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 36px;
  `
  el.innerHTML = `Loading...`

  const overlayContainer = document.getElementById('nesting-overlay-container')
  overlayContainer.appendChild(el)
}

function addAbsOverlay(rect, orientation, type) {
  const { top, left, width, height } = rect

  const el = document.createElement('div')
  el.classList.add('nesting-overlay')
  el.style.cssText = `
    position: absolute;
    border: 4px dashed ${ORIENTATION_COLOR[orientation]};
    top: ${top}px;
    left: ${left}px;
    width: ${width}px;
    height: ${height}px;
    z-index: 99000;
    visibility: visible;
  `

  if (type === DIV_LABELS.SLOT) {
    el.style.border = '4px dashed yellow'
  }

  const overlayContainer = document.getElementById('nesting-overlay-container')
  overlayContainer.appendChild(el)
}

function parseStringToTree(string) {
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

function rebuildPrompt(node = {}, onlyOneLevel = true, level = 0) {
  const { children, rect, type } = node
  const rectData = rect ? getRectData(rect) : ''

  if (!rect) {
    return NO_DATA
  }

  const elType = type === DIV_LABELS.DIV ? DIV_LABELS.SLOT : type
  let result = level > 0 ? `{type:${elType},${rectData}}` : NO_DATA

  if (!children?.length) {
    return result
  }

  if (type !== DIV_LABELS.DIV && type !== CONTENT_TAG_LABEL.A) {
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

async function computeContainersRectAndOrientation(node = {}, rootLevel = false) {
  let { children } = node

  if (children?.length) {
    children = await Promise.all(children.map(computeContainersRectAndOrientation))

    const childrenCoord = getChildrenCoordinates(children)

    const parentCoordinates = getParentCoordinates(childrenCoord, node)
    const orientation = children?.length > 1 ? getOrientationBasedOnRects(childrenCoord) : null

    node.rect = parentCoordinates
    node.orientation = orientation

    if (orientation && orientation === ORIENTATION.NOT_ALIGNED) {
      // console.log('NOT ALIGNED', node)
      // Reprocess the API call, 2 times - for this node, and if needed,
      // TODO: reprocess it's parent too.

      let prompt = rebuildPrompt(node)
      // console.log(prompt)

      if (prompt && !retried_prompts.includes(prompt)) {
        retried_prompts.push(prompt)
        prompt += ` ${GPT_END_OF_PROMPT}`

        toggleLoadingOverlay(parentCoordinates)
        const newNode = await makeOpenAICall({ prompt, callback: processOpenAIResponse })
        toggleLoadingOverlay(parentCoordinates)

        console.log(node, newNode)
        const { orientation: newOrientation } = newNode

        if (newOrientation && newOrientation !== ORIENTATION.NOT_ALIGNED) {
          // TODO: merge the new node with the old one.
          node = newNode
          return node
        }
      }
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
  }

  if (rootLevel === true) {
    buildAbsoluteOverlay(node)
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
