'use strict';

var pluck = require('lodash').pluck;
var reduce = require('lodash').reduce;
var sumCallback = require('../../util/collections').sumCallback;
var filterInternalState = require('../../util/internal-state').filter;

function StateSeed () {
  return {
    ensembleDebug: {
      serverInputQueueDepth: 0,
      clientInputQueueDepth: 0
    }
  };
}

var BeforePhysicsFrame = function DebugQueueDepth (internalState) {
  return function updateQueueDepth () {
    var onInput = filterInternalState(internalState, 'OnInput');
    var queueLengths = pluck(onInput, 'queueLength');
    var serverInputQueueDepth = reduce(queueLengths, sumCallback, 0);

    onInput = filterInternalState(internalState, 'OnInputClient');
    queueLengths = pluck(onInput, 'queueLength');
    var clientInputQueueDepth = reduce(queueLengths, sumCallback, 0);

    return [
      ['ensembleDebug.serverInputQueueDepth', serverInputQueueDepth],
      ['ensembleDebug.clientInputQueueDepth', clientInputQueueDepth],
    ];
  };
};

function OnClientReady(tracker, $) {
  function updateScreen (id, queueDepth, cssId) {
    $()(`#${cssId} .value`).text(queueDepth);
  }

  return function setup () {
    var rectSmall = require('../../../public/partials/dashboard/rect-small.jade');

    $()('#debug').append(rectSmall({
      id: 'debug-queue-depth-server',
      title: 'Server Input Queue',
      value: '0'
    }));

    $()('#debug').append(rectSmall({
      id: 'debug-queue-depth-client',
      title: 'Client Input Queue',
      value: '0'
    }));

    tracker().onChangeOf('ensembleDebug.serverInputQueueDepth', updateScreen, ['debug-queue-depth-server']);
    tracker().onChangeOf('ensembleDebug.clientInputQueueDepth', updateScreen, ['debug-queue-depth-client']);
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