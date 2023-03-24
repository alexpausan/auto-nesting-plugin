// const insertScript = document.getElementById('insert-content-script')
const getTree = document.getElementById('get-tree')
const buildTrainingDataBtn = document.getElementById('build-training')
const sendData1 = document.getElementById('send-data-1')
const sendData2 = document.getElementById('send-data-2')
const reprocessResponse = document.getElementById('reprocess-response')

let domTree
let flatStructure
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

        flatStructure = buildTrainingData(domTree)
        // flatStructure = enrichData(flatStructure)
        console.log(1, flatStructure)
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
        if (!flatStructure) {
          return
        }

        const BABBAGE_MODEL = 'babbage:ft-personal:220323-divs-v5-2023-03-22-22-13-04'

        console.log('Processing')
        openAIResponse = await getNestedStructure(flatStructure, BABBAGE_MODEL)

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
        if (!flatStructure) {
          return
        }

        const CURIE_MODEL = 'curie:ft-personal:100323-curie-divs-2023-03-10-20-07-58'

        console.log('Processing')
        openAIResponse = await getNestedStructure(flatStructure, CURIE_MODEL)

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
