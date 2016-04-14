'use strict';

var each = require('lodash').each;
var logger = require('../../logging/server/logger').logger;
var middleware = require('socketio-wildcard')();

module.exports = {
  type: 'SocketServer',
  deps: ['RawStateAccess', 'LowestInputProcessed', 'On', 'DefinePlugin', 'Time', 'SavesList'],
  func: function SocketServer (rawStateAccess, lowestInputProcessed, on, define, time, saves) {

    var io;
    var sockets = {};
    var clientSockets = {};

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

        function publishDisconnect() { on().clientDisconnect(save, socket); }
        function error (data) { on().error(data);}

        socket.on('disconnect', publishDisconnect);
        socket.on('error', error);

        return on().clientConnect(save, socket);
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

        function publishDisconnect() { on().clientDisconnect(save, socket); }
        function publishPause () { on().pause(save); }
        function publishUnpause () { on().resume(save); }
        function error (data) { on().error(data); }
        function publishInput (packet) { on().incomingClientInputPacket(packet, save); }

        socket.on('disconnect', publishDisconnect);
        socket.on('disconnect', publishPause);
        socket.on('pause', publishPause);
        socket.on('unpause', publishUnpause);
        socket.on('error', error);
        socket.on('input', publishInput);

        return on().clientConnect(save, socket);
      }

      socket.on('saveId', sendSave);
    }

    function setupPlayableClient (socket) {
      sockets[socket.id] = socket;

      socket.on('*', function () {
        console.log(arguments);
      });

      var socketInfo = {
        socketId: socket.id,
        sessionId: socket.request.sessionID,
        address: socket.handshake.address
      };
      logger.info(socketInfo, 'Socket Connected');

      socket.emit('startTime', time().present());

      function sendSave (saveId) {
        console.log(saveId);

        clientSockets[saveId] = clientSockets[saveId] || [];
        clientSockets[saveId].push(socket.id);

        var save = saves().get(saveId);

        function publishDisconnect() { on().clientDisconnect(save, socket); }
        function publishPause () { on().pause(save); }
        function publishUnpause () { on().resume(save); }
        function error (data) { on().error(data);}
        function publishInput (packet) { on().incomingClientInputPacket(packet, save); }

        socket.on('disconnect', publishDisconnect);
        socket.on('disconnect', publishPause);
        socket.on('pause', publishPause);
        socket.on('unpause', publishUnpause);
        socket.on('error', error);
        socket.on('input', publishInput);

        return on().clientConnect(save, socket);
      }

      socket.on('saveId', sendSave);
    }

    function start (server, modes, session) {
      io = require('socket.io').listen(server);
      io.use(middleware);
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