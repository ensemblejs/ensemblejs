'use strict';

var pluck = require('lodash').pluck;
var reduce = require('lodash').reduce;
var sumCallback = require('../../util/collections').sumCallback;
var filterInternalState = require('../../util/internal-state').filter;

module.exports = {
  type: 'OnPhysicsFrame',
  deps: ['Config', 'InternalState'],
  func: function OnPhysicsFrame (config, internalState) {
    if (!config().debug.inputOverlay) {
      return function () {};
    }

    function updateQueueDepth () {
      var onInput = filterInternalState(internalState, 'OnInput');

      var queueLengths = pluck(onInput, 'queueLength');
      var combinedQueueDepth = reduce(queueLengths, sumCallback, 0);

      return {
        ensembleDebug: {
          inputQueueDepth: combinedQueueDepth
        }
      };
    }

    return updateQueueDepth;
  }
};