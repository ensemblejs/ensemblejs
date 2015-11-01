'use strict';
var each = require('lodash').each;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var sequence = require('distributedlife-sequence');

module.exports = {
  type: 'SocketServer',
  deps: ['RawStateAccess', 'Logger', 'Config', 'LowestInputProcessed', 'On', 'DefinePlugin', 'Time', 'GamesList'],
  func: function SocketServer (rawStateAccess, logger, config, lowestInputProcessed, on, define, time, games) {

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

      define()('OnClientDisconnect', function OnClientDisconnect () {
        return function resetLastPacketSent () {
          lastPacket = {};
        };
      });
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
        sessionId: socket.request.sessionID,
        address: socket.handshake.address
      };
      logger().info(socketInfo, 'Socket Connected');

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

        function publishInput (packet) {
          on().incomingClientInputPacket(packet, game);
        }

        socket.on('disconnect', addLogging('disconnect', publishDisconnect));
        socket.on('disconnect', addLogging('disconnect', publishPause));
        socket.on('pause', addLogging('pause', publishPause));
        socket.on('unpause', addLogging('unpause', publishUnpause));
        socket.on('error', addLogging('error', error));
        socket.on('input', addLogging('input', publishInput));

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
    }

    function start (server, modes, session) {
      io = require('socket.io').listen(server);
      io.use(function linkSessionToSocket (socket, next) {
        session(socket.request, socket.request.res, next);
      });

      each(modes, function eachMode (mode) {
        io.of('/' + mode + '/primary').on('connection', setupPlayableClient);
      });
    }

    function stop () {
      each(intervals, function eachInterval (interval) {
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