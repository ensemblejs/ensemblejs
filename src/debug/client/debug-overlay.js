'use strict';

var overlay = require('../../../public/partials/debug-overlay.jade');

module.exports = {
  type: 'View',
  deps: ['$'],
  func: function View ($) {
    return function addDebugOverlayToBody () {
      $()('body').append(overlay());
    };
  }
};