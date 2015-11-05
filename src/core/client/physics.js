'use strict';

var paused = require('../../util/state').paused;
var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;

module.exports = {
  type: 'OnClientReady',
  deps: ['CurrentState', 'CurrentServerState', 'DefinePlugin', 'Time', 'BeforePhysicsFrame', 'OnPhysicsFrame', 'AfterPhysicsFrame', 'StateMutator', 'StateAccess', 'GameMode', 'Config'],
  func: function PhysicsLoop (clientState, serverState, define, time, beforeFrame, onFrame, afterFrame, mutator, state, mode, config) {
    var priorStep = time().present();

    var game = {
      id: 'client',
      mode: mode()
    };

    define()('InternalState', function PhysicsLoop () {
      return {
        PhysicsLoop: {
          now: function () { return time().present(); }
        }
      };
    });

    function doPaused(now) {
      priorStep = now;
    }

    function doRunning (now) {
      var delta = (now - priorStep) / 1000;
      priorStep = now;

      if (!config().client.clientSidePrediction) {
        return;
      }

      var gameState = state().for(game.id);
      var opts = [gameState, delta];

      callEachWithMutation(beforeFrame(), mutator, game.id, opts);

      if (!gameState.get('ensemble.waitingForPlayers')) {
        callForModeWithMutation(onFrame(), mutator, game, opts);
      }
    }

    function shouldRunPhysicsEngine () {
      return (!clientState().get(paused) && !serverState().get(paused));
    }

    function step() {
      var now = time().present();

      if (shouldRunPhysicsEngine()) {
        doRunning(now);
      } else {
        doPaused(now);
      }

      callEachPlugin(afterFrame());
    }

    var id;
    define()('OnDisconnect', function PhysicsLoop () {
      return function stopPhysicsLoop () {
        clearInterval(id);
        id = null;
      };
    });

    return function run () {
      step();
      id = setInterval(step, config().client.physicsUpdateLoop);
    };
  }
};