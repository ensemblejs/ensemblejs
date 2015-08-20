'use strict';

module.exports = {
  type: 'View',
  func: function View () {
    var $ = require('zepto-browserify').$;

    var overlay = require('../../../public/partials/debug-overlay.jade');

    return function addDebugOverlayToBody () {
      $('body').append(overlay());
    };
  }
};