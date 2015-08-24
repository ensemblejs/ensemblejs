'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var size = require('lodash').size;
var last = require('lodash').last;
var sequence = require('distributedlife-sequence');
var isApplicable = require('../util/modes').isApplicable;

module.exports = {
  type: 'SocketServer',
  deps: ['AcknowledgementMap', 'OnInput', 'OnPlayerConnect', 'OnPlayerDisconnect', 'OnObserverConnect', 'OnObserverDisconnect', 'RawStateAccess', 'StateMutator', 'InitialiseState', 'GamesList', 'StateAccess', 'Logger', 'Config', 'LowestInputProcessed', 'On', 'DefinePlugin', 'Time'],
  func: function SocketServer (acknowledgementMaps, onInput, onPlayerConnect, onPlayerDisconnect, onObserverConnect, onObserverDisconnect, rawStateAccess, stateMutator, initialiseState, games, state, logger, config, lowestInputProcessed, on, define, time) {

    var io;
    var statistics = {};

    function packetHasNotChanged (current, prior) {
      return isEqual(current.gameState, prior.gameState);
    }

    function startUpdateClientLoop (gameId, socketId, socket) {
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
        packet.timestamp = time().present();
        statistics[socketId].packets.unacked[packet.id] = packet.timestamp;

        socket.emit('updateState', packet);
      };

      setInterval(updateClient, config().server.pushUpdateFrequency);
    }

    function calculateLatency (socketId, acks) {
      each(acks, function (ack) {
        var sentTime = statistics[socketId].packets.unacked[ack.socketId];

        statistics[socketId].latency.total += ack.timestamp - sentTime;
      });

      statistics[socketId].packets.totalAcked += size(acks);
    }

    function removeAcknowledgedPackets (socketId, acks, gameId, mode) {
      each(acks, function (ack) {
        var applicableAckMaps = filter(acknowledgementMaps(), function(ackMap) {
          return isApplicable(mode, ackMap);
        });

        each(applicableAckMaps, function(acknowledgementMap) {
          if (last(acknowledgementMap)[ack.name] === undefined) { return; }

          each(last(acknowledgementMap)[ack.name], function (action) {
            stateMutator()(gameId, action.target(state().for(gameId), ack, action.data));
          });
        });

        delete statistics[socketId].packets.unacked[ack.socketId];
      });
    }

    function createOnInputFunction (gameId, socketId, mode) {
      return function onInputFunction (inputData) {
        var pendingAcks = inputData.pendingAcks;
        delete inputData.pendingAcks;

        var now = time().present();
        each(onInput(), function (onInputCallback) {
          onInputCallback(inputData, now, gameId, mode);
        });

        calculateLatency(socketId, pendingAcks);
        removeAcknowledgedPackets(socketId, pendingAcks, gameId, mode);
      };
    }

    function seedSocketStatistics () {
      return {
        latency: {
          total: 0
        },
        packets: {
          totalAcked: 0,
          unacked: {}
        }
      };
    }

    function getLatencyForSocket (socketId) {
      return statistics[socketId].latency;
    }

    function getPacketCountForSocket(socketId) {
      return statistics[socketId].packets.totalAcked;
    }

    function createSetupPlayableClientFunction (mode) {
      return function setupPlayableClientFunction (socket) {
        var socketInfo = {
          socketId: socket.id,
          address: socket.handshake.address
        };
        logger().socket(socketInfo, 'connected');

        socket.emit('startTime', time().present() );

        var gameId = socket.id;
        statistics[socket.id] = seedSocketStatistics();

        define()('InternalState', function Socket () {
          return {
            Socket: {
              packetCount: function packetCount () {
                return getPacketCountForSocket(socket.id);
              },
              latency: function latency () {
                return getLatencyForSocket(socket.id);
              }
            }
          };
        });

        initialiseState().initialise(gameId, mode);

        function addLogging (eventName, eventCallback) {
          return function withLogging () {
            logger().socket(socketInfo, arguments, eventName);
            eventCallback.apply(this, arguments);
          };
        }

        function publishDisconnect() {
          on().disconnect(gameId, mode);
        }

        function removeGame () {
          games().remove(gameId);
        }

        function publishPause () {
          on().pause(gameId, mode);
        }

        function publishUnpause () {
          on().resume(gameId, mode);
        }

        function logError (data) {
          logger().error(data);
        }

        socket.on('disconnect', addLogging('disconnect', publishDisconnect));
        socket.on('disconnect', addLogging('disconnect', removeGame));
        socket.on('pause', addLogging('pause', publishPause));
        socket.on('unpause', addLogging('unpause', publishUnpause));
        socket.on('error', logError);
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
    }

    function start (server, modes) {
      io = require('socket.io').listen(server);

      if (modes.length > 0) {
        each(modes, function(mode) {
          io.of('/' + mode + '/primary').on('connection', createSetupPlayableClientFunction(mode));
        });
      } else {
        io.of('/game/primary').on('connection', createSetupPlayableClientFunction('game'));
      }
    }

    function stop () {
      if (io !== undefined) {
        io.close();
      }
    }

    return {
      start: start,
      stop: stop
    };
  }
};