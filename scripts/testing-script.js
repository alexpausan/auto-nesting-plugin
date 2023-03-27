const TOP_PROP_LENGHT = 3
const LEFT_PROP_LENGHT = 4
const WIDTH_PROP_LENGHT = 5
const HEIGHT_PROP_LENGHT = 6

async function getNestedStructure(flatStructure, model, version) {
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

          processOpenAIResponse(text, version)
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

function processOpenAIResponse(text, version) {
  if (!text.length) {
    return
  }

  text = text.trim() + ']]'
  let tree = stringToTree(text, version)

  console.log({ text }, tree)

  if (!tree) {
    return
  }

  if (version !== 'v8') {
    tree = computeContainersRectAndOrientation(tree)
  }

  drawResults(tree)
}

const DIV_START = /^\[div/
const PARENT_END = /^\]/
const ELEMENT_END = /^\]/
const DIV_PATERN_LENGTH = 4
const ELEMENT_CONTENT = /^\[(\w+)\s*(top\w+)\s*(left\w+)\s*(width\w+)\s*(height\w+)/

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

function stringToTree(data, version) {
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

    const match = currentText.match(ELEMENT_CONTENT)
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

function getNodeRectFromString(match) {
  const top = parseInt(match[2].substring(TOP_PROP_LENGHT, match[2].length))
  const left = parseInt(match[3].substring(LEFT_PROP_LENGHT, match[3].length))
  const width = parseInt(match[4].substring(WIDTH_PROP_LENGHT, match[4].length))
  const height = parseInt(match[5].substring(HEIGHT_PROP_LENGHT, match[5].length))

  return {
    top,
    left,
    width,
    height,
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
