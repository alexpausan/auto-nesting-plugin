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
          processOpenAIResponse(response)
          resolve(response)
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

  console.log(text, tree)

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

    let orientation
    if (children?.length > 1) {
      let computedOrientation = getOrientationBasedOnRects(payload)

      if (computedOrientation === ORIENTATION.NOT_ALIGNED) {
        payload.alignmentTolerance = ALIGNMENT_TOLERANCE * 2
        computedOrientation = getOrientationBasedOnRects(payload)
      }

      orientation = computedOrientation
    }

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

function markForTesting({ node, hideElement = false, includeDivs = false } = {}) {
  let { nodeName, children, node: domNode } = node

  // If it's a #text node we need to get the parent
  domNode = nodeName === NODE_NAME.TEXT ? domNode.parentElement : domNode

  if (hideElement) {
    domNode.style.visibility = 'hidden'
    return
  }

  domNode.style.visibility = 'visible'
  domNode.style.background = 'rgba(0, 0, 0, 0.1)'

  // We hide the container elements
  if (CONTAINER_TAGS[nodeName] && !includeDivs && children) {
    domNode.style.visibility = 'hidden'
  }
}
