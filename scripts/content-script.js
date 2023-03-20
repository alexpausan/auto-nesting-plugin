chrome.runtime.onMessage.addListener((msg, sender, response) => {
  // First, validate the message's structure.
  if (msg.from === 'popup' && msg.subject === 'treeData') {
    // console.log(msg.treeData)
    console.log(buildTrainingData(msg.treeData))
  }
})
