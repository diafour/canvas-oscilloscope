// This script WON'T be parsed by JS engines because its mime-type is text/js-worker.
//onmessage = function (oEvent) {
    //  postMessage(myVar);
    //};
// Rest of your worker code goes here.
// Attempt to create regular time ticks emmitter
// var timer = setInterval();
// Implementation of web worker thread code
setInterval(function() { runEveryXSeconds() }, 13);

var t=0;

function runEveryXSeconds() {
    postMessage({'now':Date.now(), 't':t++});
}

