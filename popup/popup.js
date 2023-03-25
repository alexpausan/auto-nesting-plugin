// const insertScript = document.getElementById('insert-content-script')
const getTree = document.getElementById('get-tree')
const buildTrainingDataBtn = document.getElementById('build-training')
const sendData1 = document.getElementById('send-data-1')
const sendData2 = document.getElementById('send-data-2')
const reprocessResponse = document.getElementById('reprocess-response')

let domTree
let trainingData
let openAIResponse

getTree.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        domTree = getDOMData()
        console.log(0, domTree)

        // chrome.storage.local.set({ domTree })
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

        // TODO update the scraper to include the immediate parent div,
        // So that I can include those divs too in the training data

        // const buildPromptWithDivs = true
        // trainingData = trainingData.concat(buildTrainingData(domTree, buildPromptWithDivs))

        // trainingData = trainingData.concat(enrichData(trainingData))
        console.log(1, trainingData)
      },
    })
  })
})

sendData1.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url }],
      function: async ({ url }) => {
        if (!trainingData) {
          return
        }

        const BABBAGE_MODEL = 'babbage:ft-personal:2503-v6-2023-03-25-16-35-55'

        console.log('Processing')
        openAIResponse = await getNestedStructure(trainingData, BABBAGE_MODEL)

        chrome.storage.local.set({ [url]: openAIResponse })
      },
    })
  })
})

sendData2.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url }],
      function: async ({ url }) => {
        if (!trainingData) {
          return
        }

        const CURIE_MODEL = 'curie:ft-personal:100323-curie-divs-2023-03-10-20-07-58'

        console.log('Processing')
        openAIResponse = await getNestedStructure(trainingData, CURIE_MODEL)

        chrome.storage.local.set({ [url]: openAIResponse })
      },
    })
  })
})

reprocessResponse.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0]

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      args: [{ url: currentTab.url }],
      function: async ({ url }) => {
        const storageData = await chrome.storage.local.get([url])
        const openAIData = storageData[url]

        const dataToProcess = openAIData?.length ? openAIData : TESTING_DATA[url]

        console.log('Reprocess', storageData)
        // console.log('Reprocess response', tabs[0].url, dataToProcess)

        if (!dataToProcess?.length) {
          console.log(123, 'No data to process')
          return
        }

        // Remove all overlays
        document.querySelectorAll('.nesting-overlay').forEach((el) => el.remove())

        dataToProcess.forEach((response) => {
          processOpenAIResponse(response)
        })
      },
    })
  })
})
