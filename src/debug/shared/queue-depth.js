'use strict';

var pluck = require('lodash').pluck;
var reduce = require('lodash').reduce;
var sumCallback = require('../../util/collections').sumCallback;
var filterInternalState = require('../../util/internal-state').filter;

function StateSeed () {
  return {
    ensembleDebug: {
      inputQueueDepth: 0
    }
  };
}

function BeforePhysicsFrame (internalState) {
  return function updateQueueDepth () {
    var onInput = filterInternalState(internalState, 'OnInput');

    var queueLengths = pluck(onInput, 'queueLength');
    var inputQueueDepth = reduce(queueLengths, sumCallback, 0);

    return ['ensembleDebug.inputQueueDepth', inputQueueDepth];
  };
}

function OnClientReady(tracker, $) {
  function updateScreen (id, queueDepth) {
    $()('#debug-queue-depth .value').text(queueDepth);
  }

  return function setup () {
    var rectSmall = require('../../../public/partials/dashboard/rect-small.jade');

    $()('#debug').append(rectSmall({
      id: 'debug-queue-depth',
      title: 'Queue Depth',
      value: '0'
    }));

    tracker().onChangeOf('ensembleDebug.inputQueueDepth', updateScreen);
  };
}

module.exports = {
  type: 'DebugQueueDepth',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugQueueDepth (config, define) {
    if (!config().debug.input) {
      return config().nothing;
    }

    define()('StateSeed', StateSeed);
    define()('BeforePhysicsFrame', ['InternalState'], BeforePhysicsFrame);
    define()('OnClientReady', ['StateTracker', '$'], OnClientReady);
  }
};