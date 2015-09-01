'use strict';

var screenfull = require('screenfull');

module.exports = {
  type: 'OnReady',
  deps: ['$'],
  func: function Fullscreen ($) {

    return function setupOnFullscreen () {
      $()('.fullscreen').on('click', function click () {
        if (screenfull.enabled) {
          screenfull.toggle();
        }
      });
    };

  }
};