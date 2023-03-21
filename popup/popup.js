// const insertScript = document.getElementById('insert-content-script')
const getTree = document.getElementById('get-tree')
const buildTrainingDataBtn = document.getElementById('build-training')
const sendData1 = document.getElementById('send-data-1')
const sendData2 = document.getElementById('send-data-2')
const resultDiv = document.getElementById('result')

let domTree

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

        let trainingData = buildTrainingData(domTree)
        trainingData = enrichData(trainingData)

        console.log(1, trainingData)

        chrome.storage.local.set({ trainingData })
        // })
      },
    })
  })
})

sendData1.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.get(['trainingData']).then((response) => {
      const trainingData = response.trainingData

      console.log(trainingData)
    })

    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        const BABBAGE_MODEL = 'babbage:ft-personal:100323-divs-5x-2023-03-10-20-49-21'

        if (!flatStructure) {
          return
        }
        getNestedStructure(flatStructure, BABBAGE_MODEL)
      },
    })
  })
})

sendData2.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        const CURIE_MODEL = 'curie:ft-personal:100323-curie-divs-2023-03-10-20-07-58'

        if (!flatStructure) {
          return
        }
        getNestedStructure(flatStructure, CURIE_MODEL)
      },
    })
  })
})

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // message contains the data sent from the content script
  console.log(message.data)
})
