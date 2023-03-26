// const insertScript = document.getElementById('insert-content-script')
const getTree = document.getElementById('get-tree')
const buildTrainingDataBtn = document.getElementById('build-training')
const v6Button = document.getElementById('process-v6')
const v7Button = document.getElementById('process-v7')
const v8Button = document.getElementById('process-v8')
const reprocessV6 = document.getElementById('reprocess-v6')
const reprocessV7 = document.getElementById('reprocess-v7')
const reprocessV8 = document.getElementById('reprocess-v8')

let domTree
let trainingData
let openAIResponse

const MODELS = {
  v6: 'babbage:ft-personal:2503-v6-2023-03-25-16-35-55',
  v7: 'curie:ft-personal:100323-curie-divs-2023-03-10-20-07-58',
  v8: 'curie:ft-personal:100323-curie-divs-2023-03-10-20-07-58',
}

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
        trainingData = buildTrainingData(domTree)

        // trainingData = trainingData.concat(buildTrainingData(domTree, buildPromptWithDivs))
        // trainingData = trainingData.concat(enrichData(trainingData))
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

v8Button.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v8' }],
      function: openAICall,
    })
  })
})

async function openAICall({ url, version }) {
  const includeDivs = false
  trainingData = buildTrainingData(domTree, includeDivs, version)

  if (!trainingData) {
    return
  }

  const model = MODELS[version]
  console.log('Processing', version)
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

reprocessV8.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url, version: 'v8' }],
      function: reprocessData,
    })
  })
})

async function reprocessData({ url, version }) {
  const storageData = await chrome.storage.local.get([`${version}-${url}`])
  const openAIData = storageData[url]

  const dataToProcess = openAIData?.length ? openAIData : TESTING_DATA[url]

  console.log('Reprocess', storageData)
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
