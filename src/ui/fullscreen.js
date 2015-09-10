'use strict';

var screenfull = require('screenfull');

module.exports = {
  type: 'OnClientReady',
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