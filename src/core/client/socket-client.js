'use strict';

const io = require('socket.io-client');
const patch = require('socketio-wildcard')(io.Manager);
import define from '../../plugins/plug-n-play';
import {plugin, get, set} from '../../plugins/plug-n-play';
import read from 'ok-selector';
import determineSaveIdFromPath from '../../util/determine-save-id-from-path';

module.exports = {
  type: 'SocketClient',
  deps: ['Window', 'SaveMode', 'ServerUrl', 'On', 'Time', '$', 'DeviceMode', 'Config'],
  func: function SocketClient (window, mode, host, on, time, $, deviceMode, config) {

    const intervals = [];
    const url = () => `${host()}/${mode()}/${deviceMode().name}`;

    function disconnect () {
      intervals.forEach(function eachInterval (interval) {
        clearInterval(interval);
      });

      on().disconnect('client', mode());
    }

    function connect () {
      const socket = io.connect(url(), { reconnection: false });

      patch(socket);

      const saveId = determineSaveIdFromPath(window().location.pathname);
      set('SaveId', saveId);
      socket.emit('saveId', saveId);

      socket.on('startTime', function setServerOffset (serverOffset) {
        time().setOffset(serverOffset - time().present());
      });

      socket.on('connect', () => on().connect('client', mode()));
      socket.on('disconnect', disconnect);

      socket.on('playerNumber', function savePlayerId (playerNumber) {
        if (!playerNumber) {
          window().location.replace(`/saves/${saveId}/full`);
        }

        console.info({playerNumber}, 'Assigned player number');

        on().clientPlayerId(playerNumber);
      });

      socket.on('deviceNumber', function savePlayerId (deviceNumber) {
        console.info({deviceNumber}, 'Assigned device number');

        on().clientDeviceNumber(deviceNumber);
      });

      socket.on('initialState', function initialState (packet) {
        on().seedInitialState(packet, mode());
      });
      socket.on('updateState', on().incomingServerPacket);
      socket.on('error', on().error);
      socket.on('playerGroupChange', on().playerGroupChange);


      socket.on('heartbeat', () => {
        console.info('Heartbeat received from server');
      });
      function sendHeartbeat () {
        socket.emit('heartbeat');
      }
      const id = setInterval(sendHeartbeat, config().logging.heartbeatInterval);
      intervals.push(id);


      define('PauseBehaviour', function PauseBehaviour () {
        function pause () {
          if (deviceMode().canPause) {
            socket.emit('pause');
          }
        }

        function unpause () {
          if (deviceMode().canPause) {
            socket.emit('unpause');
          }
        }

        function toggle (state) {
          return read(state, 'ensemble.paused') ? unpause() : pause();
        }

        return { pause, unpause, toggle };
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

      if (deviceMode().canPause) {
        $()(window()).on('blur', pause);
        $()(window()).on('mousedown', unpause);
        $()(window()).on('keydown', unpause);
        $()(window()).on('touchstart', unpause);

        $()(window().document).on('visibilitychange', pauseIfHidden);
        $()(window().document).on('mozvisibilitychange', pauseIfHidden);
        $()(window().document).on('msvisibilitychange', pauseIfHidden);
        $()(window().document).on('webkitvisibilitychange', pauseIfHidden);
      }

      $()(window()).on('beforeunload', disconnect);

      define('OnOutgoingClientPacket', () => {
        return function sendPacketToServer (packet) {
          socket.emit('input', packet);
        };
      });

      define('OnIncomingServerPacket', () => {
        return function ackPacketReceived (packet) {
          socket.emit('ack', packet.id);
        };
      });
    }

    return { connect };
  }
};