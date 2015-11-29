'use strict';

var first = require('lodash').first;
var pluck = require('lodash').pluck;
var filterInternalState = require('../../util/internal-state').filter;
var defaultProfilerResults = require('../../util/profiler').defaultProfilerResults;
var updateProfilerResults = require('../../util/profiler').updateProfilerResults;

function StateSeed () {
  return {
    ensembleDebug: {
      fps: defaultProfilerResults('ensemblejs', 'render-loop', 'fps'),
      clientPhysicsCallRate: defaultProfilerResults('ensemblejs', 'client-physics', 'call-rate'),
      serverPhysicsCallRate: defaultProfilerResults('ensemblejs', 'server-physics', 'call-rate')
    }
  };
}

function BeforePhysicsFrame (internalState) {
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
}

function OnClientReady ($, tracker) {
  function updateFps (results) {
    updateProfilerResults($, 'debug-fps', results);
  }

  function updateClientPhysicsLoop (results) {
    updateProfilerResults($, 'debug-client-physics', results);
  }

  function updateServerPhysicsLoop (results) {
    updateProfilerResults($, 'debug-server-physics', results);
  }

  return function setupDebugOverlay () {
    var profiler = require('../../../public/partials/dashboard/profiler.jade');

    $()('#debug').append(profiler({
      id: 'debug-fps',
      title: 'FPS'
    }));

    $()('#debug').append(profiler({
      id: 'debug-client-physics',
      title: 'Client Physics'
    }));

    $()('#debug').append(profiler({
      id: 'debug-server-physics',
      title: 'Server Physics'
    }));

    tracker().onChangeOf('ensembleDebug.fps', updateFps);
    tracker().onChangeOf('ensembleDebug.clientPhysicsCallRate', updateClientPhysicsLoop);
    tracker().onChangeOf('ensembleDebug.serverPhysicsCallRate', updateServerPhysicsLoop);
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