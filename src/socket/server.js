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
  deps: ['AcknowledgementMap', 'OnInput', 'OnPlayerConnect', 'OnPlayerDisconnect', 'OnObserverConnect', 'OnObserverDisconnect', 'RawStateAccess', 'StateMutator', 'InitialiseState', 'GamesList', 'StateAccess', 'Logger', 'Config', 'LowestInputProcessed', 'On'],
  //jshint maxparams: false
  func: function SocketServer (acknowledgementMaps, onInput, onPlayerConnect, onPlayerDisconnect, onObserverConnect, onObserverDisconnect, rawStateAccess, stateMutator, initialiseState, games, state, logger, config, lowestInputProcessed, on) {

    var io;
    var statistics = {};

    var packetHasNotChanged = function packetHasNotChanged (current, prior) {
      return isEqual(current.gameState, prior.gameState);
    };

    var startUpdateClientLoop = function startUpdateClientLoop (gameId, socketId, socket) {
      var lastPacket = {};

      var updateClient = function updateClient () {
        var packet = {
          gameState: rawStateAccess().for(gameId)
        };

        if (packetHasNotChanged(packet, lastPacket)) {
          return;
        }

        lastPacket = cloneDeep(packet);

        packet.id = sequence.next('server-origin-messages');
        packet.highestProcessedMessage = lowestInputProcessed()(gameId);
        packet.sentTimestamp = Date.now();
        statistics[socketId].packets.unacked[packet.id] = packet.sentTimestamp;

        socket.emit('updateState', packet);
      };

      setInterval(updateClient, config().server.pushUpdateFrequency);
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

    var createOnInputFunction = function createOnInputFunction (gameId, socketId, mode) {
      return function onInputFunction (inputData) {
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

    var seedSocketStatistics = function seedSocketStatistics () {
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

    function addLogging (socketInfo, eventName, eventCallback) {
      return function nowWithLogging () {
        logger().socket(socketInfo, arguments, eventName);
        eventCallback.apply(this, arguments);
      };
    }

    var createSetupPlayableClientFunction = function createSetupPlayableClientFunction (mode) {
      return function setupPlayableClientFunction (socket) {
        var socketInfo = {
          socketId: socket.id,
          address: socket.handshake.address
        };
        logger().socket(socketInfo, 'connected');

        statistics[socket.id] = seedSocketStatistics();

        var gameId = socket.id;

        initialiseState().initialise(gameId, mode);

        socket.on('disconnect', addLogging(socketInfo, 'disconnect', function publishDisconnect() {
          on().disconnect(gameId, mode);
        }));

        socket.on('disconnect', addLogging(socketInfo, 'disconnect', function removeGameFomList () {
          games().remove(gameId);
        }));

        socket.on('pause', addLogging(socketInfo, 'pause', function publishPause () {
          on().pause(gameId, mode);
        }));

        socket.on('unpause', addLogging(socketInfo, 'unpause', function publishUnpause () {
          on().resume(gameId, mode);
        }));

        socket.on('error', function logError (data) {
          logger().error(data);
        });

        socket.on('input', createOnInputFunction(gameId, socket.id, mode));

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
      start: function start (server, modes) {
        io = require('socket.io').listen(server);

        if (modes.length > 0) {
          each(modes, function(mode) {
            io.of('/' + mode + '/primary').on('connection', createSetupPlayableClientFunction(mode));
          });
        } else {
          io.of('/game/primary').on('connection', createSetupPlayableClientFunction('game'));
        }
      },
      stop: function stop () {
        if (io !== undefined) {
          io.close();
        }
      }
    };
  }
};