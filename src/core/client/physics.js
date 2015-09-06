'use strict';

var paused = require('../../util/state').paused;
var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;

module.exports = {
  type: 'OnReady',
  deps: ['CurrentState', 'CurrentServerState', 'DefinePlugin', 'Time', 'OnPhysicsFrame', 'OnPhysicsFrameComplete', 'StateMutator', 'StateAccess', 'GameMode'],
  func: function PhysicsLoop (clientState, serverState, define, time, onFrame, onFrameComplete, mutator, state, mode) {
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

      var gameState = state().for(game.id);

      callForModeWithMutation(onFrame(), mutator, game, [gameState, delta]);
      callEachPlugin(onFrameComplete());
    }

    function gamePaused () {
      return clientState().get(paused) && serverState().get(paused);
    }

    function step() {
      var now = time().present();

      if (gamePaused()) {
        doPaused(now);
      } else {
        doRunning(now);
      }
    }

    define()('OnDisconnect', function PhysicsLoop () {
      return function stopPhysicsLoop () {
        clearInterval(id);
        id = null;
      };
    });

    var id;
    return function run () {
      step();
      id = setInterval(step, 15);
    };
  }
};