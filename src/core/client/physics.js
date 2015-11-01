'use strict';

var paused = require('../../util/state').paused;
var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;

module.exports = {
  type: 'OnClientReady',
  deps: ['CurrentState', 'CurrentServerState', 'DefinePlugin', 'Time', 'OnPhysicsFrameAlways', 'OnPhysicsFrameInGame', 'OnPhysicsFrameComplete', 'StateMutator', 'StateAccess', 'GameMode', 'Config'],
  func: function PhysicsLoop (clientState, serverState, define, time, onFrameAlways, onFrameInGame, onFrameComplete, mutator, state, mode, config) {
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

      if (config().client.clientSidePrediction) {
        var gameState = state().for(game.id);

        callForModeWithMutation(onFrameAlways(), mutator, game, [gameState, delta]);

        if (!state().for(game.id).for('ensemble').get('waitingForPlayers')) {
          callForModeWithMutation(onFrameInGame(), mutator, game, [gameState, delta]);
        }
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

      callEachPlugin(onFrameComplete());
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