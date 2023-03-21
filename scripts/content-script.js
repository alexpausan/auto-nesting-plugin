chrome.runtime.onMessage.addListener((msg, sender, response) => {
  const { from, subject, treeData } = msg

  // First, validate the message's structure.
  if (from === 'popup' && subject === 'treeData') {
    chrome.storage.local.get(['treeData']).then((response) => {
      const treeData = response.treeData

      if (!treeData) {
        return
      }
    })
  }
})
