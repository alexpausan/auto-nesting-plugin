// const insertScript = document.getElementById('insert-content-script')
const runContentScriptButton = document.getElementById('run-content-script')
const sendData1 = document.getElementById('send-data-1')
const sendData2 = document.getElementById('send-data-2')
const resultDiv = document.getElementById('result')

const flatStructure = []

runContentScriptButton.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        flatStructure = getDOMData()
      },
    })
  })
})

sendData1.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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
