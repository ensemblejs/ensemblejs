'use strict';

var callEachPlugin = require('../../util/modes').callEachPlugin;
var callForMode = require('../../util/modes').callForMode;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;

module.exports = {
  type: 'On',
  deps: ['StateMutator', 'StateAccess', 'OnInput', 'OnConnect', 'OnDisconnect', 'OnIncomingServerPacket', 'OnClientStart', 'OnError', 'OnOutgoingClientPacket', 'OnPause', 'OnResume', 'OnServerStart', 'OnServerReady', 'OnClientReady', 'OnServerStop', 'OnOutgoingServerPacket', 'OnClientConnect', 'OnClientDisconnect', 'OnNewGame', 'Dimensions', 'OnMute', 'OnUnmute', 'OnClientPlayerId', 'OnIncomingClientInputPacket', 'Player'],
  func: function On (mutator, state, onInput, onConnect, onDisconnect, onIncomingServerPacket, onClientStart, onError, onOutgoingClientPacket, onPause, onResume, onServerStart, onServerReady, onClientReady, onServerStop, onOutgoingServerPacket, onClientConnect, onClientDisconnect, onNewGame, dimensions, onMute, onUnmute, onClientPlayerId, onIncomingClientInputPacket, player) {

    function createOnServerPacketCallback () {
      var lastReceivedId = 0;

      return function onServerPacketCallback (packet) {
        if (packet.id <= lastReceivedId) {
          return;
        }

        lastReceivedId = packet.id;
        callEachPlugin(onIncomingServerPacket(), [packet]);
      };
    }

    function outgoingClientPacket (packet) {
      callEachPlugin(onOutgoingClientPacket(), [packet]);
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
      callForMode(onConnect(), game.mode, params);
    }

    function disconnect (game) {
      var params = [getState(game.id)];
      callForMode(onDisconnect(), game.mode, params);
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

    function clientStart (state, mode) {
      callEachPlugin(onClientStart(), [state]);
      callForMode(onClientReady(), mode, [dimensions().get(), player().id()]);
    }

    function serverStart (path, project) {
      callEachPlugin(onServerStart(), [path, project]);
      callEachPlugin(onServerReady());
    }

    function serverStop () {
      callEachPlugin(onServerStop());
    }

    function outgoingServerPacket(socketId, packet) {
      callEachPlugin(onOutgoingServerPacket(), [socketId, packet]);
    }

    function mute () {
      callEachPlugin(onMute());
    }

    function unmute () {
      callEachPlugin(onUnmute());
    }

    function clientPlayerId (id) {
      callEachPlugin(onClientPlayerId(), [id]);
    }

    function incomingClientInputPacket (packet, game) {
      if (state().for(game.id).for('ensemble').get('paused')) {
        return;
      }

      callEachPlugin(onIncomingClientInputPacket(), [packet, game]);
    }

    return {
      clientConnect: clientConnect,
      clientDisconnect: clientDisconnect,
      clientStart: clientStart,
      connect: connect,
      disconnect: disconnect,
      error: error,
      incomingServerPacket: createOnServerPacketCallback(),
      incomingClientInputPacket: incomingClientInputPacket,
      input: input,
      mute: mute,
      newGame: newGame,
      outgoingClientPacket: outgoingClientPacket,
      outgoingServerPacket: outgoingServerPacket,
      pause: pause,
      resume: resume,
      serverStart: serverStart,
      serverStop: serverStop,
      unmute: unmute,
      clientPlayerId: clientPlayerId
    };
  }
};