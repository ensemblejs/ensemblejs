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
  deps: ['AcknowledgementMap', 'OnInput', 'OnPlayerConnect', 'OnPlayerDisconnect', 'OnObserverConnect', 'OnObserverDisconnect', 'OnPause', 'OnUnpause', 'RawStateAccess', 'StateMutator', 'InitialiseState'],
  func: function(acknowledgementMap, onInput, onPlayerConnect, onPlayerDisconnect, onObserverConnect, onObserverDisconnect, onPause, onUnpause, rawStateAccess, stateMutator, initialiseState) {

    var io;
    var statistics = {};

    var startUpdateClientLoop = function (socketId, socket) {
      var lastPacket = {};

      var updateClient = function () {
        var packet = {
          gameState: rawStateAccess()
        };

        if (isEqual(packet.gameState, lastPacket.gameState)) {
          return;
        }

        lastPacket = cloneDeep(packet);

        packet.id = sequence.next('server-origin-messages');
        packet.sentTimestamp = Date.now();
        statistics[socketId].packets.unacked[packet.id] = packet.sentTimestamp;

        socket.emit('gameState/update', packet);
      };

      setInterval(updateClient, 45);
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
          if (acknowledgementMap()[name] === undefined) { return; }

          each(acknowledgementMap()[name], function (action) {
            stateMutator()(action.target(ack, action.data));
          });
        });

        delete statistics[socketId].packets.unacked[ack.socketId];
      });
    };

    var createOnInputFunction = function (socketId) {
      return function (inputData) {
        var pendingAcks = inputData.pendingAcks;
        delete inputData.pendingAcks;

        each(onInput(), function (onInputCallback) {
            onInputCallback(inputData, Date.now());
        });

        calculateLatency(socketId, pendingAcks);
        removeAcknowledgedPackets(socketId, pendingAcks);
      };
    };

    var mutateCallbackResponse = function (callbacks) {
      return function() {
        each(callbacks, function(callback) {
          stateMutator()(callback());
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

    var createSetupPlayableClientFunction = function (modeCallback) {
      return function (socket) {
        statistics[socket.id] = seedSocketStatistics();

        modeCallback();
        initialiseState().initialise();

        socket.on('disconnect', mutateCallbackResponse(onPlayerDisconnect()));
        socket.on('pause', mutateCallbackResponse(onPause()));
        socket.on('unpause', mutateCallbackResponse(onUnpause()));

        var onInput = createOnInputFunction(socket.id);
        socket.on('input', onInput);

        socket.emit('gameState/setup', rawStateAccess());

        startUpdateClientLoop(socket.id, socket);

        each(onPlayerConnect(), function(callback) {
          stateMutator()(callback());
        });
      };
    };

    return {
      start: function (server, modeCallbacks) {
        io = require('socket.io').listen(server);

        if (isFunction(modeCallbacks)) {
          io.of('/game/primary').on('connection', createSetupPlayableClientFunction(modeCallbacks));
        } else {
          each(modeCallbacks, function(callback, mode) {
            io.of('/' + mode + '/primary').on('connection', createSetupPlayableClientFunction(callback));
          });
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