'use strict';

var io = require('socket.io-client');
var patch = require('socketio-wildcard')(io.Manager);
import {last, includes, each} from 'lodash';
import define from '../../plugins/plug-n-play';
import {plugin, get, set} from '../../plugins/plug-n-play';
import {supportsInput} from '../../util/device-mode';
const {logger} = require('../../logging/client/logger');
import read from 'ok-selector';
import determineSaveIdFromPath from '../../util/determine-save-id-from-path';

module.exports = {
  type: 'SocketClient',
  deps: ['Window', 'SaveMode', 'ServerUrl', 'On', 'Time', '$', 'DeviceMode', 'Config'],
  func: function SocketClient (window, mode, host, on, time, $, deviceMode, config) {

    let intervals = [];
    const url = () => `${host()}/${mode()}/${deviceMode()}`;

    function disconnect () {
      each(intervals, function eachInterval (interval) {
        clearInterval(interval);
      });

      on().disconnect('client', mode());
    }

    function connect () {
      var socket = io.connect(url(), { reconnection: false });

      patch(socket);

      var saveId = determineSaveIdFromPath(window().location.pathname);
      set('SaveId', saveId);
      socket.emit('saveId', saveId);

      socket.on('startTime', function setServerOffset (serverOffset) {
        time().setOffset(serverOffset - time().present());
      });

      socket.on('connect', () => on().connect('client', mode()));
      socket.on('disconnect', disconnect);

      socket.on('playerNumber', function savePlayerId (playerNumber) {
        if (!playerNumber) {
          window().location.replace('/saves/' + saveId + '/full');
        }

        logger.info({playerNumber}, 'Assigned player number');

        on().clientPlayerId(playerNumber);
      });

      socket.on('deviceNumber', function savePlayerId (deviceNumber) {
        logger.info({deviceNumber}, 'Assigned device number');

        on().clientDeviceNumber(deviceNumber);
      });

      socket.on('initialState', function initialState (packet) {
        on().seedInitialState(packet, mode());
      });
      socket.on('updateState', on().incomingServerPacket);
      socket.on('error', on().error);
      socket.on('playerGroupChange', on().playerGroupChange);


      socket.on('heartbeat', () => {
        logger.info('Heartbeat received from server');
      });
      function sendHeartbeat () {
        socket.emit('heartbeat');
      }
      var id = setInterval(sendHeartbeat, config().logging.heartbeatInterval);
      intervals.push(id);


      define('PauseBehaviour', function PauseBehaviour () {
        function pause () {
          if (includes(supportsInput, deviceMode())) {
            socket.emit('pause');
          }
        }

        function unpause () {
          if (includes(supportsInput, deviceMode())) {
            socket.emit('unpause');
          }
        }

        function toggle (state) {
          return read(state, 'ensemble.paused') ? unpause() : pause();
        }

        return {
          pause: pause,
          unpause: unpause,
          toggle: toggle
        };
      });

      function pauseIfHidden () {
        if (window().document.hidden) {
          if (get('PauseBehaviour', 'pause')) {
            get('PauseBehaviour', 'pause')();
          }
        }
      }

      function pause () {
        plugin('PauseBehaviour').pause();
      }

      function unpause () {
        get('PauseBehaviour', 'unpause')();
      }

      if (includes(supportsInput, deviceMode())) {
        $()(window()).on('blur', pause);
        $()(window()).on('mousedown', unpause);
        $()(window()).on('keydown', unpause);
        $()(window()).on('touchstart', unpause);

        $()(window()).on('beforeunload', disconnect);

        $()(window().document).on('visibilitychange', pauseIfHidden);
        $()(window().document).on('mozvisibilitychange', pauseIfHidden);
        $()(window().document).on('msvisibilitychange', pauseIfHidden);
        $()(window().document).on('webkitvisibilitychange', pauseIfHidden);

        define('OnOutgoingClientPacket', () => {
          return function sendPacketToServer (packet) {
            socket.emit('input', packet);
          };
        });
      }

      define('OnIncomingServerPacket', () => {
        return function ackPacketReceived (packet) {
          socket.emit('ack', packet.id);
        };
      });
    }

    return {
      connect: connect
    };
  }
};