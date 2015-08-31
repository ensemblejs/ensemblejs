'use strict';

var screenfull = require('screenfull');
var $ = require('zepto-browserify').$;

module.exports = {
  type: 'View',
  func: function View () {
    return function setupOnFullscreen () {
      $('.fullscreen').on('click', function () {
        if (screenfull.enabled) {
          screenfull.toggle();
        }
      });
    };
  }
};