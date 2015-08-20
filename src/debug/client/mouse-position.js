'use strict';

module.exports = {
  type: 'View',
  deps: ['StateTracker'],
  func: function View (tracker) {
    var $ = require('zepto-browserify').$;

    function theMousePosition (state) {
      return state.ensembleDebug.mouse;
    }

    function updateScreen (id, current) {
      $('#mouse-position').text(current.x + ', ' + current.y);
    }

    var mousePosition = require('../../../public/partials/mouse-position.jade');

    return function setupMousePositionDebugView () {
      $('#debug').append(mousePosition());

      tracker().onChangeOf(theMousePosition, updateScreen);
    };
  }
};