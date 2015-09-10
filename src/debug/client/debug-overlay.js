'use strict';

var overlay = require('../../../public/partials/debug-overlay.jade');

module.exports = {
  type: 'OnClientReady',
  deps: ['$'],
  func: function DebugOverlay ($) {
    return function addDebugOverlayToBody () {
      $()('body').append(overlay());
    };
  }
};