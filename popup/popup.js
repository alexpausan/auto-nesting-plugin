// const insertScript = document.getElementById('insert-content-script')
const runContentScriptButton = document.getElementById('run-content-script')
const sendDataButton = document.getElementById('send-data')
const resultDiv = document.getElementById('result')

runContentScriptButton.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        getDOMData()
      },
    })
  })
})

sendDataButton.addEventListener('click', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: () => {
        sendDataToServer()
      },
    })
  })
})

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // message contains the data sent from the content script
  console.log(message.data)
})
