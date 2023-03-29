// const insertScript = document.getElementById('insert-content-script')
const getTree = document.getElementById('get-tree')
const buildTrainingDataBtn = document.getElementById('training-data')

const v9Button = document.getElementById('process-v9')
const v7Button = document.getElementById('process-v7')

const reprocessV9 = document.getElementById('reprocess-v9')
const reprocessV7 = document.getElementById('reprocess-v7')

const callGPT = document.getElementById('call-gpt4')

let domTree
let trainingData
let openAIResponse

getTree.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        domTree = getDOMData()
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

        trainingData = buildTrainingData({ node: domTree, version: 'testing' })
        trainingData = trainingData.concat(...parseSlots({ version: 'testing' }))
        console.log(1, trainingData)

        chrome.storage.local.set({ [`trainingData-${url}`]: trainingData })
      },
    })
  })
})

v9Button.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v10.0' }],
      function: openAICall,
    })
  })
})

v7Button.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v10.1' }],
      function: openAICall,
    })
  })
})

callGPT.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url }],
      function: gptCall,
    })
  })
})

async function gptCall({ url }) {
  const GPT_MODEL = 'gpt-4'

  console.log('Processing', GPT_MODEL)
  console.log(trainingData)

  // if (!trainingData) {
  // trainingData = buildTrainingData({ node: domTree, version })
  // trainingData = trainingData.concat(...parseSlots({ version }))
  // }

  if (!trainingData) {
    return
  }

  openAIResponse = await getGPTResponse(trainingData, GPT_MODEL)

  chrome.storage.local.set({ [`${GPT_MODEL}-${url}`]: openAIResponse })
}

async function openAICall({ url, version }) {
  const MODELS = {
    v9: 'babbage:ft-personal:2603-v9-2023-03-27-21-11-32',
    v7: 'babbage:ft-personal:2603-v7-2023-03-26-09-14-43',
    // v8: 'babbage:ft-personal:2603-v8-2023-03-26-08-28-43',
    ['v10.0']: 'babbage:ft-personal:2603-v10-0-2023-03-28-22-04-50',
    ['v10.1']: 'babbage:ft-personal:2603-v10-1-2023-03-29-00-08-12',
  }

  console.log('Processing', version)

  // if (!trainingData) {
  trainingData = buildTrainingData({ node: domTree, version })
  trainingData = trainingData.concat(...parseSlots({ version }))
  // }

  console.log('Payload', trainingData)

  if (!trainingData) {
    return
  }

  const model = MODELS[version]
  console.log('Processing', model)

  openAIResponse = await getNestedStructure(trainingData, model, version)

  chrome.storage.local.set({ [`${version}-${url}`]: openAIResponse })
}

reprocessV9.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v9' }],
      function: reprocessData,
    })
  })
})

reprocessV7.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v7' }],
      function: reprocessData,
    })
  })
})

async function reprocessData({ url, version }) {
  const storedAddress = `${version}-${url}`
  console.log('Reprocess', version, storedAddress)

  const storageData = await chrome.storage.local.get([storedAddress])
  const openAIData = storageData[storedAddress]

  const dataToProcess = openAIData?.length ? openAIData : TESTING_DATA[url]

  if (!dataToProcess?.length) {
    console.log(123, 'No data to process')
    return
  }

  // Remove all overlays
  document.querySelectorAll('.nesting-overlay').forEach((el) => el.remove())

  dataToProcess.forEach((response) => {
    processOpenAIResponse(response, version)
  })
}
