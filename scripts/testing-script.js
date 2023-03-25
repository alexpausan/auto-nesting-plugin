async function getNestedStructure(flatStructure, model) {
  if (!flatStructure) {
    return
  }
  // Clear previous overlays
  document.querySelectorAll('.nesting-overlay').forEach((el) => el.remove())

  const t0 = performance.now()
  const promises = []

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
            resolve('')
          }

          const { choices = [] } = response
          let { text = '' } = choices[0]

          processOpenAIResponse(text)
          resolve(text)
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

function processOpenAIResponse(text) {
  if (!text.length) {
    return
  }

  text = text.trim() + ']]'
  const tree = stringToTree(text)

  console.log({ text }, tree)

  if (!tree) {
    return
  }

  const treeWithRect = computeContainersRectAndOrientation(tree)
  drawResults(treeWithRect)
}

const DIV_START = /^\[div/
const PARENT_END = /^\]/
const ELEMENT_END = /^\]/
const DIV_PATERN_LENGTH = 4
const CONTENT_ELEMENT = /^\[(\w+)\s*(top\w+)\s*(left\w+)\s*(width\w+)\s*(height\w+)/

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
  el.style.top = rect.top + 'px'
  el.style.left = rect.left + 'px'
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

    const match = currentText.match(CONTENT_ELEMENT)

    if (!match) {
      return null
    }

    TOP_PROP_LENGHT = 3
    LEFT_PROP_LENGHT = 4
    WIDTH_PROP_LENGHT = 5
    HEIGHT_PROP_LENGHT = 6

    const elementType = match[1]
    const top = parseInt(match[2].substring(TOP_PROP_LENGHT, match[2].length))
    const left = parseInt(match[3].substring(LEFT_PROP_LENGHT, match[3].length))
    const width = parseInt(match[4].substring(WIDTH_PROP_LENGHT, match[4].length))
    const height = parseInt(match[5].substring(HEIGHT_PROP_LENGHT, match[5].length))

    const newNode = {
      type: elementType,
      rect: {
        top,
        left,
        width,
        height,
      },
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

function markForTesting({ node, hideElement = false } = {}) {
  let { nodeName, children, node: domNode } = node

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
