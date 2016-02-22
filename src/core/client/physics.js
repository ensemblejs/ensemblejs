'use strict';

var each = require('lodash').each;
var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;

import define from '../../plugins/plug-n-play';

module.exports = {
  type: 'OnClientReady',
  deps: ['CurrentState', 'CurrentServerState', 'Time', 'BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateMutator', 'StateAccess', 'SaveMode', 'Config', 'Profiler'],
  func: function PhysicsLoop (clientState, serverState, time, beforeFrame, onFrame, afterFrame, mutator, state, mode, config, profiler) {

    var rate = profiler().timer('ensemblejs', 'client-physics', 'call-rate', 1);
    var priorStep = time().present();

    var save = {
      id: 'client',
      mode: mode()
    };

    define('InternalState', function PhysicsLoop () {
      return {
        PhysicsLoop: {
          now: function now () { return time().present(); },
          callRate: function callRate () { return rate.results().rate; }
        }
      };
    });

    function doPaused(now) {
      priorStep = now;
    }

    function doRunning (now) {
      var delta = (now - priorStep) / 1000;
      priorStep = now;

      var saveState = state().for(save.id);
      var opts = [delta, saveState];

      callEachWithMutation(beforeFrame(), mutator, save.id, opts);

      if (!saveState.get('ensemble.waitingForPlayers')) {
        callForModeWithMutation(onFrame(), mutator, save, opts);
      }
    }

    function paused (state) {
      return state.ensemble.paused;
    }

    function shouldRunPhysicsEngine () {
      return (
        !clientState().get(paused) &&
        !serverState().get(paused) &&
        config().client.clientSidePrediction
      );
    }

    function step() {
      var now = time().present();

      if (shouldRunPhysicsEngine()) {
        rate.track(doRunning, [now]);
      } else {
        doPaused(now);
      }

      callEachPlugin(afterFrame());
    }

    var ids = [];
    define('OnDisconnect', function PhysicsLoop () {
      return function stopPhysicsLoop () {
        each(ids, function (id) {
          clearInterval(id);
        });

        ids = [];
      };
    });

    return function run () {
      step();
      ids.push(setInterval(step, config().client.physicsUpdateLoop));
    };
  }
};