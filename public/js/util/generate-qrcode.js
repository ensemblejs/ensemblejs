'use strict';

(function() {
  var allScripts = document.getElementsByTagName('script');
  var thisScript = allScripts[allScripts.length - 1];
  var url = thisScript.getAttribute('data-url');

  return new QRCode(document.getElementById('qrcode'), url);
})();