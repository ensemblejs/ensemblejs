'use strict';

var paused = require('../../util/state').paused;
var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;

module.exports = {
  type: 'OnClientReady',
  deps: ['CurrentState', 'CurrentServerState', 'DefinePlugin', 'Time', 'OnPhysicsFrame', 'OnPhysicsFrameComplete', 'StateMutator', 'StateAccess', 'GameMode', 'Config'],
  func: function PhysicsLoop (clientState, serverState, define, time, onFrame, onFrameComplete, mutator, state, mode, config) {
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
        callForModeWithMutation(onFrame(), mutator, game, [gameState, delta]);
      }

      callEachPlugin(onFrameComplete());
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