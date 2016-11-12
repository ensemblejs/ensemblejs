'use strict';

import each from 'lodash/each';
const logger = require('../../logging/server/logger').logger;

module.exports = {
  type: 'SocketServer',
  deps: ['On', 'DefinePlugin', 'Time', 'SavesList'],
  func: function SocketServer (on, define, time, saves) {

    let io;
    const sockets = {};
    const clientSockets = {};

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

    // function setupNonPlayableClient (socket) {
    //   sockets[socket.id] = socket;

    //   const socketInfo = {
    //     socketId: socket.id,
    //     sessionId: socket.request.sessionID,
    //     address: socket.handshake.address,
    //     deviceId: socket.request.sessionID
    //   };
    //   logger.info(socketInfo, 'Socket Connected');

    //   socket.emit('startTime', time().present());

    //   function sendSave (saveId) {
    //     clientSockets[saveId] = clientSockets[saveId] || [];
    //     clientSockets[saveId].push(socket.id);

    //     const save = saves().get(saveId);

    //     function publishDisconnect() { on().clientDisconnect(save, socket, socketInfo.deviceId); }
    //     function error (data) { on().error(data);}

    //     socket.on('disconnect', publishDisconnect);
    //     socket.on('error', error);

    //     return on().clientConnect(save, socket);
    //   }

    //   socket.on('saveId', sendSave);
    // }

    // function setupVirtualGamepad (socket) {
    //   sockets[socket.id] = socket;

    //   const socketInfo = {
    //     socketId: socket.id,
    //     sessionId: socket.request.sessionID,
    //     address: socket.handshake.address
    //   };
    //   logger.info(socketInfo, 'Socket Connected');

    //   socket.emit('startTime', time().present());

    //   function sendSave (saveId) {
    //     clientSockets[saveId] = clientSockets[saveId] || [];
    //     clientSockets[saveId].push(socket.id);

    //     const save = saves().get(saveId);

    //     function publishDisconnect() { on().clientDisconnect(save, socket, socketInfo.deviceId); }
    //     function publishPause () { on().pause(save); }
    //     function publishUnpause () { on().resume(save); }
    //     function error (data) { on().error(data); }
    //     function publishInput (packet) { on().incomingClientInputPacket(packet, save, socket); }

    //     socket.on('disconnect', publishDisconnect);
    //     socket.on('disconnect', publishPause);
    //     socket.on('pause', publishPause);
    //     socket.on('unpause', publishUnpause);
    //     socket.on('error', error);
    //     socket.on('input', publishInput);

    //     return on().clientConnect(save, socket);
    //   }

    //   socket.on('saveId', sendSave);
    // }

    // function setupPlayableClient (socket) {

    // }

    const setupDeviceMode = (deviceMode) => {
      return function onConnection (socket) {
        sockets[socket.id] = socket;

        const info = {
          socketId: socket.id,
          sessionId: socket.request.sessionID,
          address: socket.handshake.address,
          deviceId: socket.request.sessionID
        };

        logger.info({ info, deviceMode }, 'Socket Connected');

        socket.emit('startTime', time().present());

        function sendSave (saveId) {
          clientSockets[saveId] = clientSockets[saveId] || [];
          clientSockets[saveId].push(socket.id);

          const save = saves().get(saveId);

          const publishDisconnect = () => on().clientDisconnect(save, socket, info.deviceId);
          const publishPause = () => on().pause(save);
          const publishUnpause = () => on().resume(save);
          const error = (data) => on().error(data);
          const publishInput = (packet) => on().incomingClientInputPacket(packet, save, info.deviceId);

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
    };

    function start (server, gameModes, deviceModes, session) {
      io = require('socket.io').listen(server);
      io.use(function linkSessionToSocket (socket, next) {
        session(socket.request, socket.request.res, next);
      });

      gameModes.forEach((mode) => {
        deviceModes.forEach((deviceMode) => {
          io.of(`/${mode}/${deviceMode.name}`).on('connection', setupDeviceMode(deviceMode));
        });
      });
    }

    function stop () {
      if (io !== undefined) {
        io.close();
      }
    }

    return { start, stop };
  }
};