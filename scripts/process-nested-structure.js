const ALIGN_THRESHOLD = 5
const MAX_WIDTH = 1200

function buildResponsiveDesign(props) {
  const { rootLevelItems, slotItems, version } = props
  console.log(props)

  const parent = createOverlaysContainer()
  parent.rect = addOffsetToRect(getNodeRect(parent))
  parent.orientation = 'COL'

  const offset = {
    top: 0,
    left: 0,
  }

  if (allContainerItemsAreCenteredOnCrossAxis(rootLevelItems, parent)) {
    parent.style.alignItems = 'center'
  }

  // TODO: compute GAP property
  buildOverlayTree({ nodeList: rootLevelItems, parent, level: 0, offset })
}

function buildOverlayTree({ nodeList = [], parent, level = 0, offset }) {
  const { rect: parentRect, orientation: parentOrientation } = parent

  const paddingProp = parentOrientation === ORIENTATION.COL ? 'paddingTop' : 'paddingLeft'
  const directionProp = parentOrientation === ORIENTATION.COL ? 'top' : 'left'
  const sizeProp = parentOrientation === ORIENTATION.COL ? 'height' : 'width'

  if (allContainerItemsAreCenteredOnCrossAxis(nodeList, parent, parentOrientation)) {
    parent.style.alignItems = 'center'
  }

  if (nodeList?.length) {
    const firstChildPos = nodeList[0]?.rect[directionProp]
    parent.style[paddingProp] = `${firstChildPos - offset[directionProp]}px`

    const firstChildSize = nodeList[0]?.rect[directionProp] + nodeList[0]?.rect[sizeProp]
    const secondChildPos = nodeList[1]?.rect[directionProp]
    const gap = secondChildPos - firstChildSize
    parent.style.gap = `${gap}px`
  }

  nodeList.forEach((node) => {
    let { children = [], orientation } = node

    const el = createDOMElement({ node, level, parent })

    const newEl = parent.appendChild(el)
    newEl.rect = addOffsetToRect(getNodeRect(newEl))
    newEl.orientation = node.orientation

    if (children?.length) {
      offset[directionProp] = newEl.rect[directionProp]

      if (orientation !== parentOrientation) {
        const crossDirection = parentOrientation === ORIENTATION.COL ? 'left' : 'top'
        offset[crossDirection] = newEl.rect[crossDirection]
      }

      buildOverlayTree({
        nodeList: children,
        parent: newEl,
        level: level + 1,
        offset,
      })
    }

    offset[directionProp] = newEl.rect[directionProp] + newEl.rect[sizeProp]
  })
}

function createDOMElement({ node, level, parent }) {
  const { type, rect, orientation } = node
  const { rect: parentRect, orientation: parentOrientation } = parent

  // Trying to separate span from text.
  // TODO: find a better way to do this and also for HEADINGS
  const elementType =
    type === 'text' ? (rect.height > 30 ? 'p' : 'span') : ELEMENT_TYPE_TO_DOM_NODE[type]

  const el = document.createElement(elementType)
  el.classList.add('nesting-overlay')
  el.style.display = 'flex'
  el.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'

  if (orientation) {
    el.style.outline = `4px dashed ${ORIENTATION_COLOR[orientation]}`
    el.style.flexDirection = orientation === ORIENTATION.ROW ? 'row' : 'column'
  } else {
    el.style.outline = `3px dashed green`
    el.style.outlineOffset = `-4px`
  }

  if (parentOrientation === ORIENTATION.COL) {
    el.style.height = rect.height + 'px'
  }
  if (parentOrientation === ORIENTATION.ROW) {
    el.style.width = rect.width + 'px'
  }

  if (level === 0) {
    el.style.width = '100%'
    el.style.maxWidth = MAX_WIDTH + 'px'

    if (orientation === ORIENTATION.ROW) {
      el.style.flexWrap = 'wrap'
    }
  }

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

function allContainerItemsAreCenteredOnCrossAxis(childList, parent, direction = ORIENTATION.COL) {
  const { rect: parentRect } = parent

  const sizeProp = direction === ORIENTATION.COL ? 'width' : 'height'
  const directionProp = direction === ORIENTATION.COL ? 'left' : 'top'

  for (child of childList) {
    const { rect } = child
    if (
      Math.abs(
        parentRect[sizeProp] / 2 -
          (rect[directionProp] - parentRect[directionProp] + rect[sizeProp] / 2)
      ) > ALIGN_THRESHOLD
    ) {
      return false
    }
  }
  return true
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
    visibility: visible;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  `

  document.body.style.position = 'relative'
  document.body.appendChild(el)
  return el
}
