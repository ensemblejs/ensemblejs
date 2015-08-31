'use strict';

module.exports = {
  type: 'View',
  deps: ['Config', 'StateTracker', '$'],
  func: function View (config, tracker, $) {
    if (!config().debug.input) {
      return config().nothing;
    }

    function theMousePosition (state) {
      return state.ensembleDebug.mouse;
    }

    function updateScreen (id, current) {
      $()('#mouse-position').text(current.x + ', ' + current.y);
    }

    var mousePosition = require('../../../public/partials/mouse-position.jade');

    return function setupMousePositionDebugView () {
      $()('#debug').append(mousePosition());

      tracker().onChangeOf(theMousePosition, updateScreen);
    };
  }
};