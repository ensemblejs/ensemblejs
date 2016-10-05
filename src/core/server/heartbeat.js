'use strict';

import define from '../../plugins/plug-n-play';
const logger = require('../../logging/server/logger').logger;
const config = require('../../util/config');

module.exports = {
  type: 'HeartBeat',
  func: function HeartBeat () {
    let intervals = [];

    define('OnClientConnect', () => {
      return function startHeartbeart (state, socket) {
        socket.on('heartbeat', () => {
          logger.info('Heartbeat received from client');
        });

        function sendHeartbeat () {
          socket.emit('heartbeat');
        }

        const id = setInterval(sendHeartbeat, config.get().logging.heartbeatInterval);
        intervals.push(id);

        define('OnClientDisconnect', function OnClientDisconnect () {
          return function stopHeartbeat () {
            clearInterval(id);
            intervals = intervals.filter((interval) => interval !== id);
          };
        });
      };
    });

    define('OnServerStop', function heartbeat () {
      return function stopAllHeartbeats () {
        intervals.forEach(function eachInterval (interval) {
          clearInterval(interval);
        });
      };
    });
  }
};