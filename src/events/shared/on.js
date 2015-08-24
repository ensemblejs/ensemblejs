'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var first = require('lodash').first;
var intersection = require('lodash').intersection;
var getFuncOf = require('lodash').last;

//jshint maxparams: false
module.exports = {
  type: 'On',
  deps: ['StateMutator', 'StateAccess', 'OnInput', 'OnConnect', 'OnDisconnect', 'OnServerPacket', 'OnSetup', 'OnSetupComplete', 'OnError', 'OnRenderFrame', 'OnPhysicsFrame', 'OnPhysicsFrameComplete', 'OnClientPacket', 'OnPause', 'OnResume'],
  func: function On (mutator, state, onInput, onConnect, onDisconnect, onServerPacket, onSetup, onSetupComplete, onError, onRenderFrame, onPhysicsFrame, onPhysicsFrameComplete, onClientPacket, onPause, onResume) {

    function createCallAll (deferredFuncArray) {
      return function callAll () {
        var args = arguments;

        function invokeWithArguments (callback) {
          callback.apply(undefined, args);
        }

        each(deferredFuncArray(), invokeWithArguments);
      };
    }

    function createCallAllWithStateMutation (deferredFuncArray) {
      return function callAllWithStateMutation () {
        var args = Array.prototype.slice.call(arguments);

        var gameId = args[0];
        args[0] = state().for(gameId);

        function invokeWithArgumentsAndMutation (callback) {
          mutator()(
            gameId,
            getFuncOf(callback).apply(undefined, args)
          );
        }

        each(deferredFuncArray(), invokeWithArgumentsAndMutation);
      };
    }

    //TODO: factor in modes here!
    function createOnPhysicsFrameChain () {
      var onFrame = createCallAllWithStateMutation(onPhysicsFrame);
      var onFrameComplete = createCallAll(onPhysicsFrameComplete);

      return function onPhysicsFrameChain (gameId, delta) {
        onFrame(gameId, delta);
        onFrameComplete();
      };
    }


    function createOnServerPacketCallback () {
      var lastReceivedId = 0;

      return function onServerPacketCallback (packet) {
        if (packet.id <= lastReceivedId) {
          return;
        }

        lastReceivedId = packet.id;
        each(onServerPacket(), function (callback) {
          callback(packet);
        });
      };
    }

    function clientPacket (packet) {
      each(onClientPacket(), function (callback) {
        callback(packet);
      });
    }

    function connect () {
      each(onConnect(), function (callback) {
        callback();
      });
    }

    function error (data) {
      each(onError(), function (callback) {
        callback(data);
      });
    }

    function input () {
      each(onInput(), function (callback) {
        callback();
      });
    }

    function renderFrame (delta) {
      each(onRenderFrame(), function (callback) {
        callback(delta);
      });
    }

    function callAllWithMatchingModeAndMutation (gameId, mode, callbacks) {
      var gameState = state().for(gameId);

      function hasMatchingMode(callback) {
        return intersection(['*', mode], first(callback)).length > 0;
      }

      var applicableCallbacks = filter(callbacks(), hasMatchingMode);
      each(applicableCallbacks, function (callback) {
        mutator()(gameId, getFuncOf(callback)(gameState));
      });
    }

    function disconnect (gameId, mode) {
      callAllWithMatchingModeAndMutation(gameId, mode, onDisconnect);
    }

    function pause (gameId, mode) {
      callAllWithMatchingModeAndMutation(gameId, mode, onPause);
    }

    function resume (gameId, mode) {
      callAllWithMatchingModeAndMutation(gameId, mode, onResume);
    }

    function setup (state) {
      each(onSetup(), function (callback) {
        callback(state);
      });

      each(onSetupComplete(), function (callback) {
        callback();
      });
    }

    return {
      clientPacket: clientPacket,
      connect: connect,
      disconnect: disconnect,
      error: error,
      input: input,
      pause: pause,
      physicsFrame: createOnPhysicsFrameChain(),
      resume: resume,
      renderFrame: renderFrame,
      serverPacket: createOnServerPacketCallback(),
      setup: setup
    };
  }
};