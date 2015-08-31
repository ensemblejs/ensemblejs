'use strict';

var screenfull = require('screenfull');

module.exports = {
  type: 'View',
  deps: ['$'],
  func: function View ($) {

    return function setupOnFullscreen () {
      $()('.fullscreen').on('click', function click () {
        if (screenfull.enabled) {
          screenfull.toggle();
        }
      });
    };

  }
};