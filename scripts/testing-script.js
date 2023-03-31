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

async function flatToNestedStructure(flatStructure, model, version) {
  if (!flatStructure) {
    return
  }

  const t0 = performance.now()
  const promises = []

  const payload = {
    model,
    temperature: 0,
    max_tokens: 1500,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop: [']] END'],
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

  text = text.trim() + ']]'
  let tree = stringToTree(text)

  console.log({ text }, tree)
  if (!tree) {
    return
  }

  tree = computeContainersRectAndOrientation(tree, version)
  buildAbsoluteOverlay(tree)

  return tree
}

function buildAbsoluteOverlay(node) {
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
  `

  document.body.appendChild(el)
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

function computeContainersRectAndOrientation(node = {}) {
  let { type, rect, children } = node

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

    node.rect = rect
    node.orientation = orientation
  }

  return node
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
