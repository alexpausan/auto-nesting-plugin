// --- Scraping constants ---

const MAX_NAV_TOP = 50
const MAX_NAV_SIZE = 120

const ALIGNMENT_TOLERANCE = 10

const DISPLAY_GRID = 'grid'
const DISPLAY_FLEX = 'flex'

const CONTAINER_TAGS = {
  BODY: true,
  DIV: true,
  COL: true,
  COLGROUP: true,
  FOOTER: true,
  FORM: true,
  HEADER: true,
  MAIN: true,
  MENU: true,
  NAV: true,
  OBJECT: true,
  OL: true,
  UL: true,
  LI: true,
  DL: true,
  DT: true,
  DD: true,
  SECTION: true,
  SUMMARY: true,
  TABLE: true,
  TBODY: true,
  TD: true,
  TFOOT: true,
  TH: true,
  THEAD: true,
  TR: true,
  ASIDE: true,
  ARTICLE: true,
  FIGURE: true,
  FIELDSET: true,
  FIGURE: true,
  HGROUP: true,
}

const CONTENT_TAGS = {
  A: true,
  P: true,
  SPAN: true,
  H1: true,
  H2: true,
  H3: true,
  H4: true,
  H5: true,
  H6: true,
  LABEL: true,
  STRONG: true,
  EM: true,
  IMG: true,
  SVG: true,
  svg: true,
  PICTURE: true,
  BUTTON: true,
  INPUT: true,
  AUDIO: true,
  VIDEO: true,
  I: true,
  B: true,
  U: true,
  S: true,
  EM: true,
  STRONG: true,
  ABBR: true,
  ADDRESS: true,
  PRE: true,
  CODE: true,
  SMALL: true,
  BIG: true,
  HR: true,
  TEXTAREA: true,
  SELECT: true,
  IFRAME: true,
  '#text': true,
  BLOCKQUOTE: true,
}

const ORIENTATION = {
  ROW: 'ROW',
  COL: 'COL',
  GRID: 'GRID',
  BLOCK_INLINE: 'BLOCK_INLINE',
  NOT_ALIGNED: 'NOT_ALIGNED',
  ROW_WR: 'ROW_WR',
  COL_WR: 'COL_WR',
}

const STYLE_PROPERTIES = {
  FLEX: [
    'flex-direction',
    'flex-wrap',
    'justify-content',
    'align-items',
    'align-content',
    'flex-basis',
    'flex-shrink',
    'flex-grow',
    'gap',
    'order',
  ],
  GRID: [
    'grid-template-columns',
    'grid-template-rows',
    'grid-template-areas',
    'grid-column-start',
    'grid-column-end',
    'grid-row-start',
    'grid-row-end',
    'justify-items',
    'align-items',
    'gap',
  ],
  COMMON: [
    'background-color',
    'background-image',
    'box-shadow',
    'outline-width',
    'outline-style',
    'padding',
    'margin',
    'align-self',
    'position',
    'display',
    'border-width',
    'border-style',
    'font-size',
  ],
  TEXT_NODES: 'font-size',
}

const DEFAULT_STYLES = {
  'flex-direction': 'row',
  'flex-wrap': 'nowrap',
  'justify-content': 'flex-start',
  'align-items': 'stretch',
  'align-content': 'stretch',
  'flex-basis': 'auto',
  'flex-shrink': '1',
  'flex-grow': '0',
  gap: 'normal',
  order: '0',
  'grid-template-columns': 'none',
  'grid-template-rows': 'none',
  'grid-template-areas': 'none',
  'grid-column-start': 'auto',
  'grid-column-end': 'auto',
  'grid-row-start': 'auto',
  'grid-row-end': 'auto',
  'justify-items': 'normal',
  'align-items': 'normal',
  'background-color': 'rgba(0, 0, 0, 0)',
  'background-image': 'none',
  'box-shadow': 'none',
  'outline-style': 'none',
  'outline-width': '0px',
  'outline-style': 'none',
  padding: '0px',
  margin: '0px',
  position: 'static',
  display: 'inline',
  'align-self': 'auto',
  'border-width': '0px',
  'border-style': 'none',
  'font-size': '16px',
}

const NODE_NAME = {
  TEXT: '#text',
  INPUT: 'INPUT',
  SVG: 'svg',
  SELECT: 'SELECT',
  ANCHOR: 'A',
}

// ---- Prompt building constants ----

const DELTA_UNIT = 4

const MIN_PROMPT_LENGTH = 75
const MAX_PROMPT_LENGTH = 6000

const NO_DATA = ''

const GPT_END_OF_PROMPT = '###'
const GPT_END_OF_COMPLETION = 'END'

const SCROLL_ADJUSTMENT_PERCENTAGE = 0.5
const MIN_PAGE_SCROLL_WITHOUT_OFFSET = 3000
const MAX_PAGE_SCROLL_WITHOUT_OFFSET = 5000

const MIN_OFFSET_FOR_REPOSITION = 200
const MAX_OFFSET_FOR_REPOSITION = 3000
const MIN_OFFSET_FOR_FOOTER = 600
const NO_OFFSET = 0

const PROMPTS_TO_INCLUDE_DIVS = 0.3
const DIV_PERCENTAGE = 0.5

const NEGATIVE_NR = /[xy]-\d+/g

const TOP_COORDINATE_REGEX = /top(\d+)/g
const LEFT_COORDINATE_REGEX = /left(\d+)/g

const DIV_LABELS = {
  DIV: 'div',
  SLOT: 'slot',
}

const CONTENT_TAG_LABEL = {
  A: 'link',
  P: 'text',
  SPAN: 'text',
  H1: 'heading',
  H2: 'heading',
  H3: 'heading',
  H4: 'heading',
  H5: 'heading',
  H6: 'heading',
  LABEL: 'text',
  STRONG: 'text',
  ABBR: 'text',
  ADDRESS: 'text',
  PRE: 'text',
  CODE: 'text',
  SMALL: 'text',
  I: 'text',
  B: 'text',
  U: 'text',
  S: 'text',
  EM: 'text',
  IMG: 'img',
  PICTURE: 'img',
  SVG: 'img',
  svg: 'img',
  BUTTON: 'button',
  INPUT: 'input',
  TEXTAREA: 'input',
  SELECT: 'input',
  AUDIO: 'audio',
  VIDEO: 'video',
  HR: 'hr',
  IFRAME: 'iframe',
  '#text': 'text',
  BLOCKQUOTE: 'text',
}

const ORIENTATION_LABEL = {
  [ORIENTATION.ROW]: 'div',
  [ORIENTATION.COL]: 'div',
  [ORIENTATION.GRID]: 'div',
  [ORIENTATION.BLOCK_INLINE]: 'div',
  [ORIENTATION.NOT_ALIGNED]: 'NA',
  [ORIENTATION.ROW_WR]: 'div',
  [ORIENTATION.COL_WR]: 'div',
}

const ORIENTATION_COLOR = {
  [ORIENTATION.ROW]: 'rgba(255, 0, 0, 0.6)',
  [ORIENTATION.ROW_WR]: 'magenta',
  [ORIENTATION.COL]: 'rgba(0, 255, 255, 0.7)',
  [ORIENTATION.COL_WR]: '#0013ff',
  [ORIENTATION.GRID]: 'green',
  [ORIENTATION.BLOCK_INLINE]: 'yellow',
  [ORIENTATION.NOT_ALIGNED]: 'black',
}

const STYLES_TO_CHECK_VISIBILITY = {
  'border-width': true,
  'border-style': true,
  'outline-width': true,
  'outline-style': true,
  'box-shadow': true,
  'background-image': true,
  'background-color': true,
}
