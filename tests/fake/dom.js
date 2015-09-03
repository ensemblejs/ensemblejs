'use strict';

var jsdom = require('jsdom').jsdom;

function createFakeDom (html, then, done) {
  jsdom.env({
    html: html,
    done: function(err, window) {
      global.window = window;
      global.getComputedStyle = function() {};
      global.self = {};
      global.window.document.hasFocus = function () { return false; };

      then(window);
      done();
    }
  });
}

module.exports = createFakeDom;