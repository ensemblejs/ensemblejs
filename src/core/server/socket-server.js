'use strict';
var each = require('lodash').each;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var last = require('lodash').last;
var sequence = require('distributedlife-sequence');
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

module.exports = {
  type: 'SocketServer',
  deps: ['AcknowledgementMap', 'OnInput', 'RawStateAccess', 'StateMutator', 'StateAccess', 'Logger', 'Config', 'LowestInputProcessed', 'On', 'DefinePlugin', 'Time', 'GamesList'],
  func: function SocketServer (acknowledgementMaps, onInput, rawStateAccess, stateMutator, state, logger, config, lowestInputProcessed, on, define, time, games) {

    var io;
    var sockets = {};
    var intervals = [];

    function packetHasNotChanged (current, prior) {
      return isEqual(current.gameState, prior.gameState);
    }

    function startUpdateClientLoop (game, socketId) {
      var lastPacket = {};

      function updateClient () {
        var packet = {
          gameState: rawStateAccess().for(game.id)
        };

        if (packetHasNotChanged(packet, lastPacket)) {
          return;
        }

        lastPacket = cloneDeep(packet);

        packet.id = sequence.next('server-origin-messages');
        packet.highestProcessedMessage = lowestInputProcessed()(game.id);
        packet.timestamp = time().present();

        on().outgoingServerPacket(socketId, packet);
      }

      var id = setInterval(updateClient, config().server.pushUpdateFrequency);
      intervals.push(id);
    }

    function handleAcknowledgements (socketId, acks, game) {
      each(acks, function (ack) {
        var applicable = filterPluginsByMode(acknowledgementMaps(), game.mode);

        each(applicable, function(acknowledgementMap) {
          if (!last(acknowledgementMap)[ack.name]) { return; }

          each(last(acknowledgementMap)[ack.name], function (action) {
            stateMutator()(game.id, action.target(state().for(game.id), ack, action.data));
          });
        });
      });
    }

    function createOnInputFunction (game, socketId) {
      return function onInputFunction (packet) {
        if (state().for(game.id).for('ensemble').get('paused')) {
          return;
        }

        var pendingAcks = packet.pendingAcks;
        delete packet.pendingAcks;

        var now = time().present();
        each(onInput(), function (onInputCallback) {
          onInputCallback(packet, now, game);
        });

        handleAcknowledgements(socketId, pendingAcks, game);
      };
    }

    define()('OnOutgoingServerPacket', function OnOutgoingServerPacket () {
      return function emitPacket (socketId, packet) {
        sockets[socketId].emit('updateState', packet);
      };
    });

    function setupPlayableClient (socket) {
      sockets[socket.id] = socket;

      var socketInfo = {
        socketId: socket.id,
        address: socket.handshake.address
      };
      logger().socket(socketInfo, 'connected');

      socket.emit('startTime', time().present());

      function sendGame (gameId) {
        var game = games().get(gameId);

        function publishDisconnect() {
          on().clientDisconnect(game, socket);
        }

        function publishPause () {
          on().pause(game);
        }

        function publishUnpause () {
          on().resume(game);
        }

        function error (data) {
          on().error(data);
        }

        socket.on('disconnect', addLogging('disconnect', publishDisconnect));
        socket.on('disconnect', addLogging('disconnect', publishPause));
        socket.on('pause', addLogging('pause', publishPause));
        socket.on('unpause', addLogging('unpause', publishUnpause));
        socket.on('error', addLogging('error', error));
        socket.on('input', createOnInputFunction(game, socket.id));
        socket.emit('initialState', rawStateAccess().for(game.id));

        on().clientConnect(game, socket);

        startUpdateClientLoop(game, socket.id, socket);
      }

      socket.on('gameId', sendGame);

      function addLogging (eventName, eventCallback) {
        return function withLogging () {
          logger().socket(socketInfo, arguments, eventName);
          eventCallback.apply(this, arguments);
        };
      }

      socket.playerId = sequence.next('playerId');
      socket.emit('playerId', { id: socket.playerId } );
    }

    function start (server, modes) {
      io = require('socket.io').listen(server);

      each(modes, function(mode) {
        io.of('/' + mode + '/primary').on('connection', setupPlayableClient);
      });
    }

    function stop () {
      each(intervals, function(interval) {
        clearInterval(interval);
      });

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