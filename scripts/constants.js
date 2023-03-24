// Parsing all the html
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

const ORIENTATION = {
  ROW: 'ROW',
  COL: 'COL',
  GRID: 'GRID',
  BLOCK_INLINE: 'BLOCK_INLINE',
  NOT_ALIGNED: 'NOT_ALIGNED',
  ROW_WR: 'ROW_WR',
  COL_WR: 'COL_WR',
}

const DISPLAY_GRID = 'grid'

const DIV_LABELS = {
  DIV: 'div',
  SLOT: 'slot',
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

const STYLE_PROPERTIES = {
  CONTAINER: [
    'flex-direction',
    'align-items',
    'justify-content',
    'flex-wrap',
    'flex-basis',
    'flex-grow',
    'flex-shrink',
    'grid-template-columns',
    'grid-template-rows',
    'background-color',
    'background-image',
    'gap',
    'padding',
    'margin',
  ],
  COMMON: ['position', 'display', 'align-self', 'border-width', 'font-size'],
}

const NODE_NAME = {
  TEXT: '#text',
  INPUT: 'INPUT',
  SVG: 'svg',
  SELECT: 'SELECT',
  ANCHOR: 'A',
}

const MIN_CHARS = 100
const MAX_CHARS = 6000

const NO_DATA = ''

const GPT_END_OF_PROMPT = '###'
const GPT_END_OF_COMPLETION = 'END'

const SPACE_UNIT = 4
const ALIGNMENT_TOLERANCE = 10

const MAX_NAV_TOP = 50
const MAX_NAV_SIZE = 120

const SCROLL_ADJUSTMENT_PERCENTAGE = 0.5
const MIN_PAGE_SCROLL_WITHOUT_OFFSET = 2000
const MAX_PAGE_SCROLL_WITHOUT_OFFSET = 5000

const INCLUDED_CONTENT_CHILD = 0.7

const PROMPTS_TO_INCLUDE_DIVS = 0.3
const DIV_PERCENTAGE = 0.4

// ---- Testing data ---- Don't copy ----

const TESTING_DATA = {
  'https://yonk-template.webflow.io/template/style-guide': [
    '[div[div[heading x353 y120 w394 h70][div[link x262 y206 w181 h57][link x459 y206 w181 h57][link x657 y206 w181 h57]]][div[heading x192 y425 w716 h26][div[div[text x192 y496 w42 h30][proxy x336 y491 w572 h40]][div[text x192 y576 w48 h30][proxy x336 y571 w572 h40]][div[text x192 y656 w43 h30][proxy x336 y651 w572 h40]][div[text x192 y736 w59 h30][proxy x336 y731 w572 h40]][div[text x192 y816 w38 h30][proxy x336 y811 w572 h40]]]][div[proxy x192 y931 w716 h2][div[heading x192 y1013 w716 h30][heading x192 y1083 w716 h70][heading x192 y1186 w716 h53][heading x192 y1278 w716 h40][heading x192 y1355 w716 h35][heading x192 y1420 w716 h30][heading x192 y1478 w716 h25][text x192 y1529 w716 h29][text x192 y1574 w716 h29][text x192 y1618 w716 h29][text x192 y1663 w716 h29][div[text x212 y1706 w296 h30][text x212 y1730 w296 h30][text x212 y1754 w296 h30][text x212 y1798 w296 h30][text x212 y1822 w296 h30][text x212 y1846 w296 h30]]][div[heading x192 y2083 w716 h70][text x192 y2186 w716 h86][text x192 y2303 w716 h86][img x192 y2421 w716 h509][text x192 y2963 w716 h86][proxy x192 y3128 w716 h2]]][div[heading x192 y3210 w716 h30][div[link x192 y3280 w188 h57][link x192 y3361 w211 h57][link x192 y3441 w271 h57]]',
  ],
  'https://appflow-webflow-html-website-template.webflow.io/reference/instructions': [
    '[div[div[link x55 y43 w141 h31[img x55 y43 w141 h31]][div[div[link x206 y41 w85 h34][link x311 y41 w95 h34][link x425 y41 w113 h34]][link x896 y30 w149 h56]]][div[div[heading x365 y236 w369 h72][heading x83 y408 w935 h56][proxy x83 y504 w935 h525]][div[div[link x55 y1249 w164 h36[img x55 y1249 w164 h36]][text x55 y1309 w234 h64]][div[div[text x389 y1252 w74 h27][div[link x389 y1305 w72 h24][link x389 y1341 w75 h24][link x389 y1377 w103 h24][link x389 y1413 w85 h24]]][div[text x553 y1252 w79 h27][div[link x553 y1305 w98 h24][link x553 y1341 w76 h24][link x553 y1377 w94 h24][link x553 y1413 w99 h24]]][div[text x717 y1252 w110 h27][div[link x717 y1305 w75 h24][link x717 y1341 w62 h24][link x717 y1377 w84 h24][link x717 y1413 w85 h24]]][div[text x881 y1252 w96 h27][div[link x881 y1305 w161 h24[img x881 y1305 w24 h24]][text x917 y1305 w125 h24][link x881 y1356 w141 h24[img x881 y1356 w24 h24]][text x917 y1356 w105 h24]]]]]][div[div[text x55 y1516 w166 h25][link x227 y1516 w118 h25][text x345 y1516 w100 h25][link x451 y1516 w66 h25][text x517 y1516 w3 h25][link x526 y1516 w146 h25][text x671 y1516 w3 h25]]',
  ],
  'https://teleporthq.io/': [
    '[div[div[text x24 y2640 w92 h16][heading x24 y2664 w337 h275][text x24 y2955 w337 h120][link x24 y3117 w157 h50]][proxy x393 y2640 w322 h496][proxy x754 y2640 w322 h496][proxy x393 y3151 w322 h496][proxy x754 y3151 w322 h496',
    '[div[link x24 y0 w144 h80[img x24 y22 w144 h37][div[text x557 y29 w54 h22][img x616 y32 w16 h16][text x664 y29 w71 h22][img x738 y32 w16 h16]][link x786 y0 w83 h80[text x786 y29 w47 h22][link x869 y21 w69 h38][link x954 y21 w122 h38]]',
    '[div[div[heading x24 y210 w1052 h166][text x216 y400 w668 h81][div[link x320 y538 w249 h56[text x346 y554 w163 h24][img x518 y554 w24 h24]][link x598 y538 w182 h56]]][video x24 y684 w1052 h581',
    '[div[div[proxy x24 y3827 w579 h579][div[text x651 y3827 w61 h16][heading x651 y3851 w380 h110]][div[div[img x675 y4033 w24 h24][text x723 y4034 w301 h22]][div[text x675 y4065 w377 h99]][div[img x675 y4208 w24 h24][text x723 y4209 w296 h22]][div[img x675 y4260 w24 h24][text x723 y4261 w234 h22]][div[img x675 y4312 w24 h24][text x723 y4313 w309 h22]]]',
    '[div[div[text x24 y4565 w116 h16][heading x24 y4589 w425 h110]][div[div[img x48 y4771 w24 h24][text x96 y4772 w290 h22][text x48 y4803 w377 h74]][div[img x48 y4922 w24 h24][text x96 y4923 w252 h22]][div[img x48 y4974 w24 h24][text x96 y4975 w275 h22]][div[img x48 y5026 w24 h24][text x96 y5027 w213 h22]]][proxy x497 y4565 w579 h579',
    '[div[proxy x24 y5304 w579 h579][div[div[text x651 y5304 w70 h16][heading x651 y5328 w425 h110]][div[div[img x675 y5510 w24 h24][text x723 y5511 w324 h22]][div[text x675 y5542 w377 h74][div[img x675 y5660 w24 h24][text x723 y5661 w212 h22]][div[img x675 y5712 w24 h24][text x723 y5713 w292 h22]][div[img x675 y5764 w24 h24][text x723 y5765 w310 h22]]]]',
    '[div[div[text x24 y7361 w99 h16][heading x24 y7385 w596 h110][text x24 y7595 w331 h210][div[div[img x24 y7829 w56 h56][div[text x104 y7835 w50 h21][text x104 y7858 w92 h21]]][div[text x385 y7595 w331 h180][div[img x385 y7799 w56 h56][div[text x465 y7805 w35 h21][text x465 y7828 w131 h21]]]]][div[text x745 y7595 w331 h210][div[img x745 y7829 w56 h56][div[text x825 y7835 w38 h21][text x825 y7858 w98 h21]]]]][div[heading x124 y8131 w428 h110][text x124 y8257 w428 h108][link x124 y8397 w245 h52[text x148 y8411 w163 h24][img x321 y8411 w24 h24]]][img x584 y8060 w496 h378',
    '[div[div[text x489 y1589 w121 h16][heading x205 y1613 w689 h165][text x174 y1794 w751 h48]][div[proxy x24 y1922 w1052 h120][div[div[text x38 y2171 w63 h26][text x38 y2205 w194 h120][div[img x38 y2341 w24 h36][proxy x270 y2273 w7 h2]][div[text x315 y2171 w87 h26][text x315 y2205 w194 h120][div[img x315 y2341 w36 h36][img x359 y2341 w36 h36][img x403 y2341 w36 h36]]][proxy x547 y2273 w7 h2]][div[text x591 y2171 w100 h26][text x591 y2205 w194 h120][div[img x591 y2341 w34 h36][proxy x823 y2273 w7 h2]][div[text x868 y2171 w42 h26][text x868 y2205 w194 h120][div[img x868 y2341 w36 h36][img x912 y2341 w36 h36][img x956 y2341 w36 h36][img x1000 y2341 w36 h36]]]]]',
    '[div[div[text x441 y6083 w217 h16][heading x278 y6107 w543 h110][text x302 y6233 w496 h48]][div[div[div[link x472 y6323 w157 h50[img x48 y6461 w24 h24][text x48 y6517 w229 h24]][div[text x48 y6549 w283 h72][img x409 y6461 w24 h24][text x409 y6517 w234 h24][text x409 y6549 w283 h48]]][div[link x769 y6461 w24 h24][text x769 y6517 w202 h24][text x769 y6549 w283 h72]]][div[div[link x48 y6699 w24 h24][text x48 y6755 w145 h24][text x48 y6787 w283 h48]]][div[div[link x409 y6699 w24 h24][text x409 y6755 w180 h24][text x409 y6787 w283 h72]]][div[div[link x69 y6699 w24 h24][text x69 y6755 w213 h24][text x69 y6787 w283 h72]]][div[div[link x48 y6937 w24 h24][text x48 y6993 w240 h24][text x48 y7025 w283 h72]]][div[div[link x409 y6937 w24 h24][text x409 y6993 w235 h24][text x409 y7025 w283 h72]]][div[div[link x769 y6937 w24 h24][text x769 y6993 w234 h24][text x769 y7025 w283 h48]]]',
    '[div[div[div[text x24 y8690 w58 h22][div[link x24 y8743 w191 h40][link x24 y8783 w149 h40][link x24 y8823 w170 h40][link x24 y8863 w160 h40][link x24 y8903 w120 h40][link x24 y8943 w128 h80[text x24 y8943 w128 h24][text x24 y8983 w86 h24]][link x24 y9023 w95 h40]][div[text x293 y8690 w69 h22][div[link x293 y8743 w160 h40][link x293 y8783 w157 h40][link x293 y8823 w103 h40][link x293 y8863 w150 h40][link x293 y8903 w170 h40][link x293 y8943 w168 h40][link x293 y8983 w153 h40][link x293 y9023 w127 h40][link x293 y9063 w107 h40]]][div[text x562 y8690 w44 h22][div[link x562 y8743 w62 h40][link x562 y8783 w51 h40][link x562 y8823 w77 h40][link x562 y8863 w91 h40][link x562 y8903 w124 h40][link x562 y8943 w75 h40]][div[text x831 y8690 w46 h22][div[link x831 y8743 w80 h40[img x831 y8743 w24 h24]][text x865 y8743 w46 h24][link x831 y8783 w90 h40[img x831 y8783 w24 h24]][text x865 y8783 w56 h24][link x831 y8823 w79 h40[img x831 y8823 w24 h24]][text x865 y8823 w45 h24][link x831 y8863 w91 h40[img x831 y8863 w24 h24]][text x865 y8863 w57 h24][link x831 y8903 w100 h40[img x831 y8903 w24 h24]][text x865 y8903 w66 h24][link x831 y8943 w85 h40[img x831 y8943 w27 h27]][text x865 y8943 w51 h24]]]]][div[div[img x294 y9151 w126 h100][img x500 y9151 w100 h100][img x680 y9151 w127 h100]][div[text x469 y9291 w161 h24][text x24 y9336 w1052 h49][text x136 y9404 w828 h24][link x479 y9428 w141 h24]][text x94 y9473 w912 h24]][div[div[img x357 y9567 w132 h27][text x513 y9568 w231 h24]]]',
  ],
  'https://automator-template.webflow.io/about': [
    '[div[heading x128 y322 w494 h79][text x128 y425 w494 h70',
    '[div[link x40 y5188 w494 h440][link x566 y5188 w494 h440',
    '[div[heading x304 y5896 w494 h216][link x467 y6154 w167 h55',
    '[div[link x40 y60 w160 h43][div[link x882 y60 w73 h38][link x971 y60 w90 h42]',
    '[div[heading x128 y3407 w845 h28][proxy x128 y3443 w8 h8][heading x128 y3451 w845 h346',
    '[div[heading x40 y4229 w1020 h72][div[div[proxy x40 y4581 w56 h56][div[text x176 y4397 w271 h20][text x176 y4435 w641 h152]]][div[text x271 y4717 w293 h20][text x271 y4755 w649 h191]]][proxy x1004 y4940 w56 h56',
    '[div[div[proxy x68 y860 w526 h519][div[proxy x594 y1100 w88 h40][heading x698 y768 w319 h288][text x698 y1072 w319 h144][div[div[img x708 y1266 w26 h26][text x761 y1267 w206 h57]][div[img x708 y1363 w27 h26][text x762 y1363 w123 h25]][div[img x708 y1435 w27 h26][text x762 y1435 w178 h25]]]]',
    '[div[div[heading x84 y2345 w319 h230][text x84 y2591 w319 h144][div[div[proxy x84 y2775 w47 h48][text x147 y2787 w206 h57]][div[proxy x84 y2871 w48 h48][text x148 y2883 w123 h25]][div[proxy x84 y2943 w48 h48][text x148 y2955 w178 h25]]]][div[proxy x419 y2648 w88 h40][proxy x506 y2409 w526 h519]',
    '[div[heading x40 y1656 w1020 h72][div[div[text x88 y1815 w222 h58][text x80 y1889 w239 h35]][div[text x450 y1815 w200 h58][text x431 y1889 w239 h35]][div[text x873 y1815 w55 h58][text x781 y1889 w239 h35]][div[text x185 y2036 w30 h58][text x80 y2110 w239 h35]][div[text x502 y2036 w96 h58][text x431 y2110 w239 h35]][div[text x843 y2036 w115 h58][text x781 y2110 w239 h35]]',
    '[div[div[div[div[link x40 y6435 w143 h29][text x303 y6438 w61 h20][link x295 y6469 w82 h42][link x295 y6511 w68 h42][link x295 y6552 w62 h42][link x295 y6594 w73 h42]][div[text x418 y6438 w74 h20][link x410 y6469 w50 h42][link x410 y6511 w61 h42][link x410 y6552 w76 h42]][div[text x533 y6438 w50 h20][link x525 y6469 w101 h42][link x525 y6511 w82 h42][link x525 y6552 w105 h42][link x525 y6594 w98 h42]][div[text x741 y6438 w78 h20][text x741 y6477 w319 h51][div[input x741 y6560 w178 h58][input x903 y6560 w157 h58]][text x741 y6634 w319 h67]]]][div[div[text x40 y6816 w226 h15][link x270 y6816 w78 h15][text x741 y6816 w42 h15][link x787 y6816 w66 h15][text x917 y6816 w67 h15][link x987 y6816 w49 h15]]',
  ],
}
