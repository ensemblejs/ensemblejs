'use strict';

var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForMode = require('../../util/modes').callForMode;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;

module.exports = {
  type: 'On',
  deps: ['StateMutator', 'StateAccess', 'OnInput', 'OnConnect', 'OnDisconnect', 'OnServerPacket', 'OnSetup', 'OnError', 'OnClientPacket', 'OnPause', 'OnResume', 'OnStart', 'OnReady', 'OnStop', 'OnOutgoingServerPacket', 'OnClientConnect', 'OnClientDisconnect', 'OnNewGame', 'Dimensions'],
  func: function On (mutator, state, onInput, onConnect, onDisconnect, onServerPacket, onSetup, onError, onClientPacket, onPause, onResume, onStart, onReady, onStop, onOutgoingServerPacket, onClientConnect, onClientDisconnect, onNewGame, dimensions) {

    function createOnServerPacketCallback () {
      var lastReceivedId = 0;

      return function onServerPacketCallback (packet) {
        if (packet.id <= lastReceivedId) {
          return;
        }

        lastReceivedId = packet.id;
        callEachPlugin(onServerPacket(), [packet]);
      };
    }

    function clientPacket (packet) {
      callEachPlugin(onClientPacket(), [packet]);
    }

    function error (data) {
      callEachPlugin(onError(), [data]);
    }

    function input () {
      callEachPlugin(onInput());
    }

    function getState (gameId) {
      return state().for(gameId);
    }

    function connect (game) {
      var params = [getState(game.id)];
      callForModeWithMutation(onConnect(), mutator, game, params);
    }

    function disconnect (game) {
      var params = [getState(game.id)];
      callForModeWithMutation(onDisconnect(), mutator, game, params);
    }

    function newGame (game) {
      callEachWithMutation(onNewGame(), mutator, game.id, [game]);
    }

    function clientConnect (game, socket) {
      var params = [getState(game.id), socket, game];
      callForModeWithMutation(onClientConnect(), mutator, game, params);
    }

    function clientDisconnect (game, socket) {
      var params = [getState(game.id), socket, game];
      callForModeWithMutation(onClientDisconnect(), mutator, game, params);
    }

    function pause (game) {
      var params = [getState(game.id)];
      callForModeWithMutation(onPause(), mutator, game, params);
    }

    function resume (game) {
      var params = [getState(game.id)];
      callForModeWithMutation(onResume(), mutator, game, params);
    }

    function setup (state, mode) {
      callEachPlugin(onSetup(), [state]);
      callForMode(onReady(), mode, [dimensions().get()]);
    }

    function start (path, modes) {
      callEachPlugin(onStart(), [path, modes]);
      callEachPlugin(onReady());
    }

    function stop () {
      callEachPlugin(onStop());
    }

    function outgoingServerPacket(socketId, packet) {
      callEachPlugin(onOutgoingServerPacket(), [socketId, packet]);
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
      newGame: newGame,
      input: input,
      outgoingServerPacket: outgoingServerPacket,
      serverPacket: createOnServerPacketCallback(),
      error: error,
      pause: pause,
      resume: resume
    };
  }
};