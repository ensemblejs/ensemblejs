'use strict';

module.exports = {
  type: 'OnReady',
  deps: ['Config', 'StateTracker', '$'],
  func: function DebugQueueDepth (config, tracker, $) {
    if (!config().debug.input) {
      return config().nothing;
    }

    function theQueueDepth (state) {
      return state.ensembleDebug.inputQueueDepth;
    }

    function updateScreen (id, queueDepth) {
      $()('#queue-depth').text(queueDepth);
    }

    var queueDepth = require('../../../public/partials/queue-depth.jade');

    return function setupDebugQueueDepthView () {
      $()('#debug').append(queueDepth());

      tracker().onChangeOf(theQueueDepth, updateScreen);
    };
  }
};