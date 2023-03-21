chrome.runtime.onMessage.addListener((msg, sender, response) => {
  const { from, subject, treeData } = msg

  // First, validate the message's structure.
  if (from === 'popup' && subject === 'treeData') {
    // console.log(msg.treeData)
    if (!treeData) {
      return
    }

    let trainingData = buildTrainingData(treeData)
    trainingData = enrichData(trainingData)

    console.log(trainingData)
  }
})
