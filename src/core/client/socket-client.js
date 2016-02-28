'use strict';

var io = require('socket.io-client');
import {last, includes} from 'lodash';
import define from '../../plugins/plug-n-play';
import {plugin, get, set} from '../../plugins/plug-n-play';
import {supportsInput} from '../../util/device-mode';

module.exports = {
  type: 'SocketClient',
  deps: ['Window', 'SaveMode', 'ServerUrl', 'On', 'Time', '$', 'DeviceMode'],
  func: function SocketClient (window, mode, host, on, time, $, deviceMode) {

    function url () {
      return `${host()}/${mode()}/${deviceMode()}`;
    }

    function connect () {
      var socket = io.connect(url(), { reconnection: false });

      var saveId = last(window().location.pathname.split('/'));
      set('SaveId', saveId);
      socket.emit('saveId', saveId);

      socket.on('startTime', function (serverOffset) {
        var currentClientTime = time().present();
        time().setOffset(serverOffset - currentClientTime);
      });
      socket.on('connect', function connect () {
        on().connect('client', mode());
      });
      socket.on('disconnect', function disconnect () {
        on().disconnect('client', mode());
      });

      socket.on('playerNumber', function savePlayerId (playerNumber) {
        if (!playerNumber) {
          window().location.replace('/saves/' + saveId + '/full');
        }

        on().clientPlayerId(playerNumber);
      });

      socket.on('deviceNumber', function savePlayerId (deviceNumber) {
        on().clientDeviceNumber(deviceNumber);
      });

      socket.on('initialState', function initialState (packet) {
        on().clientStart(packet, mode());
      });
      socket.on('updateState', on().incomingServerPacket);
      socket.on('error', on().error);
      socket.on('playerGroupChange', on().playerGroupChange);

      define('PauseBehaviour', function PauseBehaviour () {
        return {
          pause: function pause () {
            if (includes(supportsInput, deviceMode())) {
              socket.emit('pause');
            }
          },
          unpause: function unpause () {
            if (includes(supportsInput, deviceMode())) {
              socket.emit('unpause');
            }
          },
          toggle: function toggle (state) {
            if (state.get('ensemble.paused')) {
              this.unpause();
            } else {
              this.pause();
            }
          }
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
        $()(window().document).on('visibilitychange', pauseIfHidden);
        $()(window().document).on('mozvisibilitychange', pauseIfHidden);
        $()(window().document).on('msvisibilitychange', pauseIfHidden);
        $()(window().document).on('webkitvisibilitychange', pauseIfHidden);

        define('OnOutgoingClientPacket', function SocketClient () {
          return function sendPacketToServer (packet) {
            socket.emit('input', packet);
          };
        });
      }

      define('OnIncomingServerPacket', function SocketClient () {
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