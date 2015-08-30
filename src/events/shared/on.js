'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var first = require('lodash').first;
var intersection = require('lodash').intersection;
var getFuncOf = require('lodash').last;

module.exports = {
  type: 'On',
  deps: ['StateMutator', 'StateAccess', 'OnInput', 'OnConnect', 'OnDisconnect', 'OnServerPacket', 'OnSetup', 'OnSetupComplete', 'OnError', 'OnRenderFrame', 'OnPhysicsFrame', 'OnPhysicsFrameComplete', 'OnClientPacket', 'OnPause', 'OnResume', 'OnStart', 'OnReady', 'OnStop', 'OnOutgoingServerPacket', 'OnClientConnect', 'OnClientDisconnect'],
  func: function On (mutator, state, onInput, onConnect, onDisconnect, onServerPacket, onSetup, onSetupComplete, onError, onRenderFrame, onPhysicsFrame, onPhysicsFrameComplete, onClientPacket, onPause, onResume, onStart, onReady, onStop, onOutgoingServerPacket, onClientConnect, onClientDisconnect) {

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

    function callAllWithMatchingModeAndMutation (game, callbacks, data) {
      var args = data || [];
      args.unshift(state().for(game.id));

      function hasMatchingMode(callback) {
        return intersection(['*', game.mode], first(callback)).length > 0;
      }

      var applicableCallbacks = filter(callbacks(), hasMatchingMode);
      each(applicableCallbacks, function (callback) {
        mutator()(
          game.id,
          getFuncOf(callback).apply(undefined, args)
        );
      });
    }

    function callAllWithMutation (gameId, callbacks, data) {
      var args = data || [];
      args.unshift(state().for(gameId));

      each(callbacks(), function (callback) {
        mutator()(
          gameId,
          getFuncOf(callback).apply(undefined, args)
        );
      });
    }

    function connect (game) {
      callAllWithMutation(game.id, onConnect);
    }

    function disconnect (game) {
      callAllWithMutation(game.id, onDisconnect);
    }

    function clientConnect (game, socket) {
      callAllWithMutation(game.id, onClientConnect, [socket, game]);
    }

    function clientDisconnect (game, socket) {
      callAllWithMutation(game.id, onClientDisconnect, [socket, game]);
    }

    function pause (game) {
      if (state().for(game.id).for('ensemble').get('paused')) {
        return;
      }

      callAllWithMatchingModeAndMutation(game, onPause);
    }

    function resume (game) {
      if (!state().for(game.id).for('ensemble').get('paused')) {
        return;
      }

      callAllWithMatchingModeAndMutation(game, onResume);
    }

    function setup (state) {
      each(onSetup(), function (callback) {
        callback(state);
      });

      each(onSetupComplete(), function (callback) {
        callback();
      });
    }

    function start (path, modes) {
      each(onStart(), function (callback) {
        callback(path, modes);
      });

      each(onReady(), function (callback) {
        callback();
      });
    }

    function stop (path, modes) {
      each(onStop(), function (callback) {
        callback(path, modes);
      });
    }

    function outgoingServerPacket(socketId, packet) {
      each(onOutgoingServerPacket(), function (callback) {
        callback(socketId, packet);
      });
    }

    return {
      start: start,
      stop: stop,
      setup: setup,
      connect: connect,
      disconnect: disconnect,
      clientConnect: clientConnect,
      clientDisconnect: clientDisconnect,
      clientPacket: clientPacket,
      input: input,
      outgoingServerPacket: outgoingServerPacket,
      serverPacket: createOnServerPacketCallback(),
      error: error,
      pause: pause,
      resume: resume,
      renderFrame: renderFrame,   //TODO: move
      physicsFrame: createOnPhysicsFrameChain() //TODO: move
    };
  }
};