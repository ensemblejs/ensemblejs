'use strict';

import define from '../../plugins/plug-n-play';
import { each , reject } from 'lodash';
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');

module.exports = {
  type: 'HeartBeat',
  func: function HeartBeat () {
    let intervals = [];

    define('OnClientConnect', function HeartBeat () {
      return function startHeartbeart (state, socket) {
        socket.on('heartbeat', () => {
          logger.info('Heartbeat received from client');
        });

        function sendHeartbeat () {
          socket.emit('heartbeat');
        }

        var id = setInterval(sendHeartbeat, config.get().logging.heartbeatInterval);
        intervals.push(id);

        define('OnClientDisconnect', function OnClientDisconnect () {
          return function stopHeartbeat () {
            clearInterval(id);
            intervals = reject(intervals, (interval) => interval === id);
          };
        });
      };
    });

    define('OnServerStop', function heartbeat () {
      return function stopAllHeartbeats () {
        each(intervals, function eachInterval (interval) {
          clearInterval(interval);
        });
      };
    });
  }
};