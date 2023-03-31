function buildResponsiveDesign(props) {
  const { rootLevelItems, slotItems, version } = props

  const topValues = []
  const bottomValues = []
  const width = []
  const height = []

  for (rootChild of rootLevelItems) {
    const { rect } = rootChild

    topValues.push(rect.top)
    bottomValues.push(rect.top + rect.height)
    leftValues.push(rect.left)
    rightValues.push(rect.left + rect.width)
  }

  topValues.sort((a, b) => a - b)
  bottomValues.sort((a, b) => a - b)
  leftValues.sort((a, b) => a - b)
  rightValues.sort((a, b) => a - b)

  // Recreate overlay container
  // createOverlaysContainer()
  console.log(props)
}

function createOverlaysContainer() {
  const prevEl = document.getElementById('nesting-overlay-container')
  if (prevEl) {
    prevEl.remove()
  }

  const el = document.createElement('div')
  el.id = 'nesting-overlay-container'
  el.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99000;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  `

  document.body.style.position = 'relative'
  document.body.appendChild(el)
}

function buildOverlayTree(node, parent, parentOrientation) {
  let { children, orientation } = node

  if (!parent) {
    parent = document.getElementById('nesting-overlay-container')
    parent.rect = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
  }

  const el = createDOMElement(node, parent)
  parent.appendChild(el)

  // updateParentElementSpacing(node, parent, parentOrientation)

  if (children?.length) {
    children.forEach((child) => buildOverlayTree(child, el, orientation))
  }
}

function createDOMElement(node) {
  let { type, rect, orientation } = node

  const el = document.createElement(ELEMENT_TYPE_TO_DOM_NODE[type])
  el.classList.add('nesting-overlay')

  if (type === DIV_ELEMENT) {
    el.style.border = `4px dashed ${ORIENTATION_COLOR[orientation]}`
  }

  // el.style.top = rect.top + 'px'
  // el.style.left = rect.left + 'px'
  el.style.width = rect.width + 'px'
  el.style.height = rect.height + 'px'
  el.style.display = 'flex'
  el.style.flexDirection = orientation === ORIENTATION.COL ? 'column' : 'row'

  return el
}

function updateParentElementSpacing(node, parent, parentOrientation) {
  const { type, rect, children, orientation } = node
  const { rect: parentRect } = parent
  const { top, left, width, height } = rect
  const { top: parentTop, left: parentLeft, width: parentWidth, heigth: parentHeight } = parentRect

  // TODO: explore different options based on orientation
  if (parentOrientation === ORIENTATION.COL) {
    parent.style.paddingTop = `${top - parentTop}px`
  } else {
    parent.style.paddingLeft = `${left - parentLeft}px`
  }
}
