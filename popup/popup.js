// const insertScript = document.getElementById('insert-content-script')
const getTree = document.getElementById('get-tree')
const buildTrainingDataBtn = document.getElementById('training-data')

// const v13Button = document.getElementById('process-v13')
const v14Button = document.getElementById('process-v14')
const v15Button = document.getElementById('process-v15')
const v16Button = document.getElementById('process-v16')
// const reprocessV13 = document.getElementById('reprocess-v13')
const reprocessV14 = document.getElementById('reprocess-v14')
const reprocessV15 = document.getElementById('reprocess-v15')
const reprocessV16 = document.getElementById('reprocess-v16')

// const callGPT = document.getElementById('call-gpt4')

let domTree
let trainingData
let slotsToProcess
let openAIResponse

getTree.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        domTree = getDOMData('testing')
        console.log(0, domTree.children)
      },
    })
  })
})

buildTrainingDataBtn.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      args: [{ url: currentTab.url }],
      function: ({ url }) => {
        if (!domTree) {
          console.log('No domTree')
        }

        trainingData = buildTrainingData({ node: domTree, version: 'testing' }) || []
        slotsToProcess = parseSlots({ version: 'testing' })
        console.log(1, trainingData, slotsToProcess)

        chrome.storage.local.set({ [`trainingData-${url}`]: trainingData })
      },
    })
  })
})

// v13Button.addEventListener('click', () => callAPIHandler('v13'))
v14Button.addEventListener('click', () => callAPIHandler('v14'))
v15Button.addEventListener('click', () => callAPIHandler('v15'))
v16Button.addEventListener('click', () => callAPIHandler('v16'))

function callAPIHandler(version = 'v14') {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version }],
      function: openAICall,
    })
  })
}

async function gptCall({ url }) {
  const GPT_MODEL = 'gpt-4'

  console.log('Processing', GPT_MODEL)
  console.log(trainingData)

  if (!trainingData) {
    return
  }

  openAIResponse = await getGPTResponse(trainingData, GPT_MODEL)

  chrome.storage.local.set({ [`${GPT_MODEL}-${url}`]: openAIResponse })
}

async function openAICall({ url, version }) {
  const MODELS = {
    // v7: 'babbage:ft-personal:2603-v7-2023-03-26-09-14-43',
    // v11: 'babbage:ft-personal:3003-v11-2023-03-30-13-01-43',
    // v13: 'babbage:ft-personal:0804-v13-2023-04-08-18-14-50',
    v14: 'babbage:ft-personal:2404-v14-2023-04-24-20-25-25',
    v15: 'babbage:ft-personal:2404-v15-2023-04-24-21-07-56',
    v16: 'babbage:ft-personal:2404-v16-2023-04-24-21-49-58',
  }

  console.log('Processing', version)

  trainingData = buildTrainingData({ node: domTree, version }) || []
  slotsToProcess = parseSlots({ version })

  console.log('Payload', trainingData, slotsToBuildTrainingDataFor)

  if (!trainingData) {
    return
  }

  const model = MODELS[version]
  console.log(trainingData, slotsToProcess)

  createOverlaysContainer()
  let rootLevelItems = await callAPIForNestedStructure(trainingData, model, version)
  let slotItems = await callAPIForNestedStructure(slotsToProcess, model, version)

  rootLevelItems = buildContainerDataAndOrientation(rootLevelItems)
  slotItems = buildContainerDataAndOrientation(slotItems)

  // buildResponsiveDesign({ rootLevelItems, slotItems, version })

  chrome.storage.local.set({ [`${version}-${url}`]: { rootLevelItems, slotItems } })
}

reprocessV14.addEventListener('click', () => reprocessHandler('v14'))
reprocessV15.addEventListener('click', () => reprocessHandler('v15'))
reprocessV16.addEventListener('click', () => reprocessHandler('v16'))

function reprocessHandler(version = 'v14') {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version }],
      function: reprocessData,
    })
  })
}

async function reprocessData({ url, version }) {
  const storedAddress = `${version}-${url}`
  console.log('Reprocess', version, storedAddress)

  const storageData = await chrome.storage.local.get([storedAddress])
  const { rootLevelItems, slotItems } = storageData[storedAddress]

  if (!rootLevelItems?.length) {
    console.log(123, 'No data to process')
    return
  }

  buildResponsiveDesign({ rootLevelItems, slotItems, version, reprocess: true })
}
