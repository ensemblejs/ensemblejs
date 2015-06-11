'use strict';

var each = require('lodash').each;
var isEqual = require('lodash').isEqual;
var isFunction = require('lodash').isFunction;
var cloneDeep = require('lodash').cloneDeep;
var size = require('lodash').size;
var sequence = require('distributedlife-sequence');

//jshint maxparams:false
module.exports = {
  type: 'SocketSupport',
  deps: ['AcknowledgementMap', 'OnInput', 'OnPlayerConnect', 'OnPlayerDisconnect', 'OnObserverConnect', 'OnObserverDisconnect', 'OnPause', 'OnUnpause', 'RawStateAccess', 'StateMutator', 'InitialiseState', 'GamesList', 'StateAccess'],
  func: function(acknowledgementMaps, onInput, onPlayerConnect, onPlayerDisconnect, onObserverConnect, onObserverDisconnect, onPause, onUnpause, rawStateAccess, stateMutator, initialiseState, games, state) {

    var io;
    var statistics = {};

    var packetHasNotChanged = function(current, prior) {
      return isEqual(current.gameState, prior.gameState);
    };

    var startUpdateClientLoop = function (gameId, socketId, socket) {
      var lastPacket = {};

      var updateClient = function () {
        var packet = {
          gameState: rawStateAccess().for(gameId)
        };

        if (packetHasNotChanged(packet, lastPacket)) {
          return;
        }

        lastPacket = cloneDeep(packet);

        packet.id = sequence.next('server-origin-messages');
        packet.sentTimestamp = Date.now();
        statistics[socketId].packets.unacked[packet.id] = packet.sentTimestamp;

        socket.emit('updateState', packet);
      };

      setInterval(updateClient, 15);
    };

    var calculateLatency = function (socketId, pendingAcknowledgements) {
      each(pendingAcknowledgements, function (ack) {
        var sentTime = statistics[socketId].packets.unacked[ack.socketId];

        statistics[socketId].latency.total += ack.rcvdTimestamp - sentTime;
      });

      statistics[socketId].packets.totalAcked += size(pendingAcknowledgements);
    };

    var removeAcknowledgedPackets = function (socketId, pendingAcknowledgements) {
      each(pendingAcknowledgements, function (ack) {
        each(ack.names, function (name) {
          each(acknowledgementMaps(), function(acknowledgementMap) {
            if (acknowledgementMap[name] === undefined) { return; }

            each(acknowledgementMap[name], function (action) {
              stateMutator()(action.target(ack, action.data));
            });
          });
        });

        delete statistics[socketId].packets.unacked[ack.socketId];
      });
    };

    var createOnInputFunction = function (gameId, socketId) {
      return function (inputData) {
        var pendingAcks = inputData.pendingAcks;
        delete inputData.pendingAcks;

        var receivedTime = Date.now();
        each(onInput(), function (onInputCallback) {
          onInputCallback(inputData, receivedTime, gameId);
        });

        calculateLatency(socketId, pendingAcks);
        removeAcknowledgedPackets(socketId, pendingAcks);
      };
    };

    var mutateCallbackResponse = function (gameId, callbacks) {
      return function() {
        var gameState = state().for(gameId);

        each(callbacks, function(callback) {
          stateMutator()(gameState, callback(gameId));
        });
      };
    };

    var seedSocketStatistics = function() {
      return {
        packets: {
          totalAcked: 0,
          unacked: {}
        },
        latency: {
          total: 0
        }
      };
    };

    var createSetupPlayableClientFunction = function () {
      return function (socket) {
        statistics[socket.id] = seedSocketStatistics();

        var gameId = socket.id;

        initialiseState().initialise(gameId);

        socket.on('disconnect', mutateCallbackResponse(gameId, onPlayerDisconnect()));
        //TODO: move to it's own event handler
        socket.on('disconnect', function () {
          console.log('removing game ' + gameId);
          games().remove(gameId);
        });

        socket.on('pause', mutateCallbackResponse(gameId, onPause()));
        socket.on('unpause', mutateCallbackResponse(gameId, onUnpause()));

        socket.on('error', function (data) {
          console.log(data);
        });

        var onInput = createOnInputFunction(gameId, socket.id);
        socket.on('input', onInput);

        socket.emit('initialState', rawStateAccess().for(gameId));

        socket.playerId = sequence.next('playerId');
        socket.emit('playerId', { id: socket.playerId } );

        startUpdateClientLoop(gameId, socket.id, socket);

        each(onPlayerConnect(), function(callback) {
          stateMutator()(callback(gameId));
        });

        //TODO: add this as a handler somewhere
        games().add({id: gameId});
      };
    };

    return {
      start: function (server, modeCallbacks) {

        if (isFunction(modeCallbacks)) {
          modeCallbacks();
        } else {
          each(modeCallbacks, function(callback) {
            callback();
          });
        }

        io = require('socket.io').listen(server);
        io.of('/game/primary').on('connection', createSetupPlayableClientFunction());

      },
      stop: function () {
        if (io !== undefined) {
          io.close();
        }
      }
    };
  }
};