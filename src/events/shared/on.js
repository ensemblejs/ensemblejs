'use strict';

var callEachPlugin = require('../../util/modes').callEachPlugin;
var callEachPluginAndPromises = require('../../util/modes').callEachPluginAndPromises;
var callForMode = require('../../util/modes').callForMode;
var callEachWithMutation = require('../../util/modes').callEachWithMutation;
var callForModeWithMutation = require('../../util/modes').callForModeWithMutation;
var callForModeWithMutationWithPromises = require('../../util/modes').callForModeWithMutationWithPromises;

module.exports = {
  type: 'On',
  deps: ['StateMutator', 'StateAccess', 'OnInput', 'OnConnect', 'OnDisconnect', 'OnIncomingServerPacket', 'OnClientStart', 'OnError', 'OnOutgoingClientPacket', 'OnPause', 'OnResume', 'OnServerStart', 'OnServerReady', 'OnClientReady', 'OnServerStop', 'OnOutgoingServerPacket', 'OnClientConnect', 'OnClientDisconnect', 'OnNewSave', 'Dimensions', 'OnMute', 'OnUnmute', 'OnClientPlayerId', 'OnIncomingClientInputPacket', 'Player', 'OnPlayerGroupChange', 'OnSaveReady', 'OnDatabaseReady', 'OnLoadSave', 'OnIncomingPeerPacket', 'OnClientDeviceNumber', 'Device'],
  func: function On (mutator, state, onInput, onConnect, onDisconnect, onIncomingServerPacket, onClientStart, onError, onOutgoingClientPacket, onPause, onResume, onServerStart, onServerReady, onClientReady, onServerStop, onOutgoingServerPacket, onClientConnect, onClientDisconnect, onNewSave, dimensions, onMute, onUnmute, onClientPlayerId, onIncomingClientInputPacket, player, onPlayerGroupChange, onSaveReady, onDatabaseReady, onLoadSave, onIncomingPeerPacket, onClientDeviceNumber, device) {

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

    function incomingPeerPacket (packet) {
      callEachPlugin(onIncomingPeerPacket(), [packet]);
    }

    function error (data) {
      callEachPlugin(onError(), [data]);
    }

    function input () {
      callEachPlugin(onInput());
    }

    function getState (saveId) {
      return state().for(saveId);
    }

    function connect (save) {
      var params = [getState(save.id)];
      callForMode(onConnect(), save.mode, params);
    }

    function disconnect (save) {
      var params = [getState(save.id)];
      callForMode(onDisconnect(), save.mode, params);
    }

    function newSave (save) {
      callEachWithMutation(onNewSave(), mutator, save.id, [save]);
    }

    function saveReady (save) {
      return callEachPluginAndPromises(onSaveReady(), [save]);
    }

    function clientConnect (save, socket) {
      var params = [getState(save.id), socket, save];
      return callForModeWithMutationWithPromises(onClientConnect(), mutator, save, params);
    }

    function clientDisconnect (save, socket) {
      var params = [getState(save.id), socket, save];
      return callForModeWithMutationWithPromises(onClientDisconnect(), mutator, save, params);
    }

    function pause (save) {
      var params = [getState(save.id)];
      callForModeWithMutation(onPause(), mutator, save, params);
    }

    function resume (save) {
      var params = [getState(save.id)];
      callForModeWithMutation(onResume(), mutator, save, params);
    }

    function clientStart (state, mode) {
      callEachPlugin(onClientStart(), [state]);
      callForMode(onClientReady(), mode, [dimensions().get(), player().id(), device().number()]);
    }

    function serverStart (path, save) {
      callEachPlugin(onServerStart(), [path, save]);
      callEachPlugin(onServerReady(), [path, save]);
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

    function clientDeviceNumber (number) {
      callEachPlugin(onClientDeviceNumber(), [number]);
    }

    function incomingClientInputPacket (packet, save) {
      if (state().for(save.id).get('ensemble.paused')) {
        return;
      }

      callEachPlugin(onIncomingClientInputPacket(), [packet, save]);
    }

    function playerGroupChange (players, saveId) {
      callEachPlugin(onPlayerGroupChange(), [players, saveId]);
    }

    function databaseReady () {
      callEachPlugin(onDatabaseReady());
    }

    function loadSave (save) {
      callEachPlugin(onLoadSave(), [save]);
    }

    return {
      clientConnect: clientConnect,
      clientDisconnect: clientDisconnect,
      clientPlayerId: clientPlayerId,
      clientDeviceNumber: clientDeviceNumber,
      clientStart: clientStart,
      connect: connect,
      databaseReady: databaseReady,
      disconnect: disconnect,
      error: error,
      saveReady: saveReady,
      incomingClientInputPacket: incomingClientInputPacket,
      incomingServerPacket: createOnServerPacketCallback(),
      incomingPeerPacket: incomingPeerPacket,
      input: input,
      loadSave: loadSave,
      mute: mute,
      newSave: newSave,
      outgoingClientPacket: outgoingClientPacket,
      outgoingServerPacket: outgoingServerPacket,
      pause: pause,
      playerGroupChange: playerGroupChange,
      resume: resume,
      serverStart: serverStart,
      serverStop: serverStop,
      unmute: unmute
    };
  }
};