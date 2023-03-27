// const insertScript = document.getElementById('insert-content-script')
const getTree = document.getElementById('get-tree')
const buildTrainingDataBtn = document.getElementById('training-data')

const v6Button = document.getElementById('process-v6')
const v7Button = document.getElementById('process-v7')

const reprocessV6 = document.getElementById('reprocess-v6')
const reprocessV7 = document.getElementById('reprocess-v7')

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
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        if (!domTree) {
          console.log('No domTree')
        }

        trainingData = buildTrainingData({ node: domTree, version: 'testing' })

        console.log(trainingData)
        trainingData = trainingData.concat(...parseSlots({ version: 'testing' }))
        console.log(1, trainingData)
      },
    })
  })
})

v6Button.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v6' }],
      function: openAICall,
    })
  })
})

v7Button.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v7' }],
      function: openAICall,
    })
  })
})

async function openAICall({ url, version }) {
  const MODELS = {
    v6: 'babbage:ft-personal:2503-v6-2023-03-25-16-35-55',
    v7: 'babbage:ft-personal:2603-v7-2023-03-26-09-14-43',
    // v8: 'babbage:ft-personal:2603-v8-2023-03-26-08-28-43',
  }

  trainingData = trainingData ? trainingData : buildTrainingData({ node: domTree, version })
  console.log('Payload', trainingData)

  if (!trainingData) {
    return
  }
  const model = MODELS[version]
  console.log('Processing', model)

  openAIResponse = await getNestedStructure(trainingData, model, version)

  chrome.storage.local.set({ [`${version}-${url}`]: openAIResponse })
}

reprocessV6.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v6' }],
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
