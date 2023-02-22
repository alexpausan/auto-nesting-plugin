// var bkg = chrome.extension.getBackgroundPage();
// bkg.console.log('foo');

console.log('foo')
// alert(123)
function changeColor() {
  console.log(1234)
  // var color = document.getElementById("color").value;
  // chrome.tabs.executeScript({ file: "getTree.js" });
  // chrome.tabs.executeScript({code: "document.body.style.backgroundColor = '" + color + "';"});
}

document.getElementById('change-color')?.addEventListener('click', changeColor)
