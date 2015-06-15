'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var size = require('lodash').size;
var intersection = require('lodash').intersection;
var first = require('lodash').first;
var last = require('lodash').last;
var sequence = require('distributedlife-sequence');

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

module.exports = {
  type: 'SocketServer',
  deps: ['AcknowledgementMap', 'OnInput', 'OnPlayerConnect', 'OnPlayerDisconnect', 'OnObserverConnect', 'OnObserverDisconnect', 'OnPause', 'OnUnpause', 'RawStateAccess', 'StateMutator', 'InitialiseState', 'GamesList', 'StateAccess'],
  //jshint maxparams: false
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

    var removeAcknowledgedPackets = function (socketId, pendingAcknowledgements, gameId, mode) {

      each(pendingAcknowledgements, function (ack) {
        each(ack.names, function (name) {
          var applicableAckMaps = filter(acknowledgementMaps(), function(ackMap) {
            return isApplicable(mode, ackMap);
          });

          each(applicableAckMaps, function(acknowledgementMap) {
            if (last(acknowledgementMap)[name] === undefined) { return; }

            each(last(acknowledgementMap)[name], function (action) {
              stateMutator()(gameId, action.target(state().for(gameId), ack, action.data));
            });
          });
        });

        delete statistics[socketId].packets.unacked[ack.socketId];
      });
    };

    var createOnInputFunction = function (gameId, socketId, mode) {
      return function (inputData) {
        var pendingAcks = inputData.pendingAcks;
        delete inputData.pendingAcks;

        var receivedTime = Date.now();
        each(onInput(), function (onInputCallback) {
          onInputCallback(inputData, receivedTime, gameId, mode);
        });

        calculateLatency(socketId, pendingAcks);
        removeAcknowledgedPackets(socketId, pendingAcks, gameId, mode);
      };
    };

    var mutateCallbackResponse = function (gameId, callbacks) {
      return function() {
        var mode = games().get(gameId).mode;
        var gameState = state().for(gameId);

        var applicableCallbacks = filter(callbacks, function(callback) {
          return isApplicable(mode, callback);
        });

        each(applicableCallbacks, function(callback) {
          stateMutator()(gameId, last(callback)(gameState));
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

    var createSetupPlayableClientFunction = function (mode) {
      return function (socket) {
        statistics[socket.id] = seedSocketStatistics();

        var gameId = socket.id;

        initialiseState().initialise(gameId, mode);

        socket.on('disconnect', mutateCallbackResponse(gameId, onPlayerDisconnect()));
        socket.on('disconnect', function () {
          games().remove(gameId);
        });

        socket.on('pause', mutateCallbackResponse(gameId, onPause()));
        socket.on('unpause', mutateCallbackResponse(gameId, onUnpause()));

        socket.on('error', function (data) {
          console.log(data);
        });

        var onInput = createOnInputFunction(gameId, socket.id, mode);
        socket.on('input', onInput);

        socket.emit('initialState', rawStateAccess().for(gameId));

        socket.playerId = sequence.next('playerId');
        socket.emit('playerId', { id: socket.playerId } );

        startUpdateClientLoop(gameId, socket.id, socket);

        var callbacksForMode = filter(onPlayerConnect(), function(callback) {
          return isApplicable(mode, callback);
        });
        each(callbacksForMode, function(callback) {
          stateMutator()(gameId, last(callback)(state().for(gameId)));
        });


        games().add({id: gameId, mode: mode});
      };
    };

    return {
      start: function (server, modes) {
        io = require('socket.io').listen(server);

        if (modes.length > 0) {
          each(modes, function(mode) {
            io.of('/' + mode + '/primary').on('connection', createSetupPlayableClientFunction(mode));
          });
        } else {
          io.of('/game/primary').on('connection', createSetupPlayableClientFunction('game'));
        }
      },
      stop: function () {
        if (io !== undefined) {
          io.close();
        }
      }
    };
  }
};