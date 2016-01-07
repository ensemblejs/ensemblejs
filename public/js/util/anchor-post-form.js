'use strict';
//jshint browser:true

var link = document.getElementById('form-action');
link.addEventListener('click', function () {
  document.getElementById('the-form').submit();
}, false);