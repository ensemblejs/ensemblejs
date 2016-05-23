'use strict';

(function () {
  var thisScript = document.getElementById('qr-runner');
  var url = thisScript.getAttribute('data-url');
  var qr = new QRCode(document.getElementById('qrcode'), url);
  return qr;
})();