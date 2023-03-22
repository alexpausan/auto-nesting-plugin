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

        chrome.storage.local.set({ domTree })
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
        console.log(1, flatStructure)
        // chrome.storage.local.set({ flatStructure })
      },
    })
  })
})

sendData1.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: async () => {
        if (!flatStructure) {
          return
        }

        const BABBAGE_MODEL = 'babbage:ft-personal:220323-divs-v5-2023-03-22-22-13-04'
        console.log('Call made')
        openAIResponse = await getNestedStructure(flatStructure, BABBAGE_MODEL)
      },
    })
  })
})

sendData2.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: async () => {
        if (!flatStructure) {
          return
        }

        const CURIE_MODEL = 'curie:ft-personal:100323-curie-divs-2023-03-10-20-07-58'
        console.log('Call made')
        openAIResponse = await getNestedStructure(flatStructure, CURIE_MODEL)
      },
    })
  })
})

reprocessResponse.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        if (!openAIResponse?.length) {
          return
        }

        console.log('Reprocess response', openAIResponse)
        // Remove all overlays
        document.querySelectorAll('.nesting-overlay').forEach((el) => el.remove())

        openAIResponse.forEach((response) => {
          processOpenAIResponse(response)
        })
      },
    })
  })
})
