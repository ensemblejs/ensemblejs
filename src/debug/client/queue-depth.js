'use strict';

module.exports = {
  type: 'View',
  deps: ['StateTracker'],
  func: function View (tracker) {
    var $ = require('zepto-browserify').$;

    function theQueueDepth (state) {
      return state.ensembleDebug.inputQueueDepth;
    }

    function updateScreen (id, queueDepth) {
      $('#queue-depth').text(queueDepth);
    }

    var queueDepth = require('../../../public/partials/queue-depth.jade');

    return function setupDebugQueueDepthView () {
      $('#debug').append(queueDepth());

      tracker().onChangeOf(theQueueDepth, updateScreen);
    };
  }
};