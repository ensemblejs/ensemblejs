'use strict';
var each = require('lodash').each;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var sequence = require('distributedlife-sequence');
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');

module.exports = {
  type: 'SocketServer',
  deps: ['RawStateAccess', 'LowestInputProcessed', 'On', 'DefinePlugin', 'Time', 'SavesList'],
  func: function SocketServer (rawStateAccess, lowestInputProcessed, on, define, time, saves) {

    var io;
    var sockets = {};
    var intervals = [];
    var clientSockets = {};

    function skipThisPacket (current, prior) {
      return isEqual(current, prior);
    }

    function sendInitialState (socket, state) {
      socket.emit('initialState', state);
    }

    function startUpdateClientLoop (save, socketId) {
      var lastPacket = {};

      function updateClient () {
        var packet = {
          highestProcessedMessage: lowestInputProcessed()(save.id),
          saveState: rawStateAccess().for(save.id)
        };

        if (skipThisPacket(packet, lastPacket)) {
          return;
        }

        lastPacket = cloneDeep(packet);

        packet.id = sequence.next('server-origin-messages');
        packet.timestamp = time().present();

        on().outgoingServerPacket(socketId, packet);
      }

      var id = setInterval(updateClient, config.get().server.pushUpdateFrequency);
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

    define()('OnPlayerGroupChange', function OnPlayerConnected () {
      return function propagate (players, saveId) {
        each(clientSockets[saveId], function emitPlayersToSocket (socketId) {
          sockets[socketId].emit('playerGroupChange', players);
        });
      };
    });

    function setupNonPlayableClient (socket) {
      sockets[socket.id] = socket;

      var socketInfo = {
        socketId: socket.id,
        sessionId: socket.request.sessionID,
        address: socket.handshake.address
      };
      logger.info(socketInfo, 'Socket Connected');

      socket.emit('startTime', time().present());

      function sendSave (saveId) {
        clientSockets[saveId] = clientSockets[saveId] || [];
        clientSockets[saveId].push(socket.id);

        var save = saves().get(saveId);

        function publishDisconnect() {
          on().clientDisconnect(save, socket);
        }

        function error (data) {
          on().error(data);
        }

        function addLogging (eventName, eventCallback) {
          return function withLogging () {
            logger.socket(socketInfo, arguments, eventName);
            eventCallback(...arguments);
          };
        }

        socket.on('disconnect', addLogging('disconnect', publishDisconnect));
        socket.on('error', addLogging('error', error));

        return on().clientConnect(save, socket).then(() => {
          sendInitialState(socket, rawStateAccess().for(save.id));
        }).then(() => {
          startUpdateClientLoop(save, socket.id);
        });
      }

      socket.on('saveId', sendSave);
    }

    function setupVirtualGamepad (socket) {
      sockets[socket.id] = socket;

      var socketInfo = {
        socketId: socket.id,
        sessionId: socket.request.sessionID,
        address: socket.handshake.address
      };
      logger.info(socketInfo, 'Socket Connected');

      socket.emit('startTime', time().present());

      function sendSave (saveId) {
        clientSockets[saveId] = clientSockets[saveId] || [];
        clientSockets[saveId].push(socket.id);

        var save = saves().get(saveId);

        function publishDisconnect() {
          on().clientDisconnect(save, socket);
        }

        function publishPause () {
          on().pause(save);
        }

        function publishUnpause () {
          on().resume(save);
        }

        function error (data) {
          on().error(data);
        }

        function publishInput (packet) {
          on().incomingClientInputPacket(packet, save);
        }

        function addLogging (eventName, eventCallback) {
          return function withLogging () {
            logger.socket(socketInfo, arguments, eventName);
            eventCallback(...arguments);
          };
        }

        socket.on('disconnect', addLogging('disconnect', publishDisconnect));
        socket.on('disconnect', addLogging('disconnect', publishPause));
        socket.on('pause', addLogging('pause', publishPause));
        socket.on('unpause', addLogging('unpause', publishUnpause));
        socket.on('error', addLogging('error', error));
        socket.on('input', addLogging('input', publishInput));

        return on().clientConnect(save, socket).then(() => {
          sendInitialState(socket, rawStateAccess().for(save.id));
        }).then(() => {
          startUpdateClientLoop(save, socket.id);
        });
      }

      socket.on('saveId', sendSave);
    }

    function setupPlayableClient (socket) {
      sockets[socket.id] = socket;

      var socketInfo = {
        socketId: socket.id,
        sessionId: socket.request.sessionID,
        address: socket.handshake.address
      };
      logger.info(socketInfo, 'Socket Connected');

      socket.emit('startTime', time().present());

      function sendSave (saveId) {
        clientSockets[saveId] = clientSockets[saveId] || [];
        clientSockets[saveId].push(socket.id);

        var save = saves().get(saveId);

        function publishDisconnect() {
          on().clientDisconnect(save, socket);
        }

        function publishPause () {
          on().pause(save);
        }

        function publishUnpause () {
          on().resume(save);
        }

        function error (data) {
          on().error(data);
        }

        function publishInput (packet) {
          on().incomingClientInputPacket(packet, save);
        }

        function addLogging (eventName, eventCallback) {
          return function withLogging () {
            logger.socket(socketInfo, arguments, eventName);
            eventCallback(...arguments);
          };
        }

        socket.on('disconnect', addLogging('disconnect', publishDisconnect));
        socket.on('disconnect', addLogging('disconnect', publishPause));
        socket.on('pause', addLogging('pause', publishPause));
        socket.on('unpause', addLogging('unpause', publishUnpause));
        socket.on('error', addLogging('error', error));
        socket.on('input', addLogging('input', publishInput));
        socket.on('heartbeat', () => {
          logger.info('Heartbeat received from client');
        });

        function sendHeartbeat () {
          socket.emit('heartbeat');
        }
        setInterval(sendHeartbeat, config.get().logging.heartbeatInterval);

        return on().clientConnect(save, socket).then(() => {
          sendInitialState(socket, rawStateAccess().for(save.id));
        }).then(() => {
          startUpdateClientLoop(save, socket.id);
        });
      }

      socket.on('saveId', sendSave);
    }

    function start (server, modes, session) {
      io = require('socket.io').listen(server);
      io.use(function linkSessionToSocket (socket, next) {
        session(socket.request, socket.request.res, next);
      });

      each(modes, function eachMode (mode) {
        io.of('/' + mode + '/primary').on('connection', setupPlayableClient);
        io.of('/' + mode + '/observer').on('connection', setupNonPlayableClient);
        io.of('/' + mode + '/gamepad').on('connection', setupVirtualGamepad);
        io.of('/' + mode + '/mobile').on('connection', setupVirtualGamepad);
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