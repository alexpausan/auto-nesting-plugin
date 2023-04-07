// const insertScript = document.getElementById('insert-content-script')
const getTree = document.getElementById('get-tree')
const buildTrainingDataBtn = document.getElementById('training-data')

const v11Button = document.getElementById('process-v11')
const reprocessV11 = document.getElementById('reprocess-v11')

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

v11Button.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v11' }],
      function: openAICall,
    })
  })
})

// callGPT.addEventListener('click', function () {
//   chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
//     const currentTab = tabs[0]
//     chrome.scripting.executeScript({
//       target: { tabId: currentTab.id },
//       args: [{ url: currentTab.url }],
//       function: gptCall,
//     })
//   })
// })

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
    v11: 'babbage:ft-personal:3003-v11-2023-03-30-13-01-43',
  }

  console.log('Processing', version)

  trainingData = buildTrainingData({ node: domTree, version }) || []
  slotsToProcess = parseSlots({ version })

  console.log('Payload', trainingData, slotsToBuildTrainingDataFor)

  if (!trainingData) {
    return
  }

  const model = MODELS[version]
  // console.log('Processing', model)

  console.log(trainingData, slotsToProcess)

  createOverlaysContainer()
  let rootLevelItems = await flatToNestedStructure(trainingData, model, version)
  let slotItems = await flatToNestedStructure(slotsToProcess, model, version)

  // buildResponsiveDesign({ rootLevelItems, slotItems, version })

  chrome.storage.local.set({ [`${version}-${url}`]: { rootLevelItems, slotItems } })
}

reprocessV11.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v11' }],
      function: reprocessData,
    })
  })
})

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
