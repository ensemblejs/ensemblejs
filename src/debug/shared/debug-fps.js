'use strict';

var first = require('lodash').first;
var pluck = require('lodash').pluck;
var filterInternalState = require('../../util/internal-state').filter;
var round = require('round-precision');

function StateSeed () {
  return ['ensembleDebug', {
    fps: 0,
    clientPhysicsCallRate: 0,
    serverPhysicsCallRate: 0
  }];
}

var BeforePhysicsFrame = function DebugCore (internalState) {
  return function updateData () {
    var ensembleDebug = {};

    var renderLoopStats = filterInternalState(internalState, 'RenderLoop');
    if (renderLoopStats.length !== 0) {
      ensembleDebug.fps = first(pluck(renderLoopStats, 'fps'))();
    }

    var clientPhysics = filterInternalState(internalState, 'PhysicsLoop');
    if (clientPhysics.length > 0) {
      ensembleDebug.clientPhysicsCallRate = first(pluck(clientPhysics, 'callRate'))();
    }

    var serverPhysics = filterInternalState(internalState, 'ServerSideEngine');
    if (serverPhysics.length > 0) {
      ensembleDebug.serverPhysicsCallRate = first(pluck(serverPhysics, 'callRate'))();
    }

    return ['ensembleDebug', ensembleDebug];
  };
};

function OnClientReady ($, tracker) {
  function updateWidget (current, prior, cssId) {
    $()(`#${cssId} .value`).text(round(current, 1));
  }

  return function setupDebugOverlay () {
    var widget = require('../../../public/partials/dashboard/rect-small.jade');

    $()('#debug').append(widget({
      id: 'debug-fps',
      title: 'FPS'
    }));

    $()('#debug').append(widget({
      id: 'debug-client-physics',
      title: 'Client Physics'
    }));

    $()('#debug').append(widget({
      id: 'debug-server-physics',
      title: 'Server Physics'
    }));

    tracker().onChangeOf('ensembleDebug.fps', updateWidget, ['debug-fps']);
    tracker().onChangeOf('ensembleDebug.clientPhysicsCallRate', updateWidget, ['debug-client-physics']);
    tracker().onChangeOf('ensembleDebug.serverPhysicsCallRate', updateWidget, ['debug-server-physics']);
  };
}

module.exports = {
  type: 'DebugCore',
  deps: ['DefinePlugin', 'Config'],
  func: function DebugCore (define, config) {
    if (!config().debug.fps) {
      return;
    }

    define()('StateSeed', StateSeed);
    define()('OnClientReady', ['$', 'StateTracker'], OnClientReady);
    define()('BeforePhysicsFrame', ['InternalState'], BeforePhysicsFrame);
  }
};