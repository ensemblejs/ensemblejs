'use strict';

var io = require('socket.io-client');
import {last, contains} from 'lodash';
import define from '../../plugins/plug-n-play';
import {plugin, get} from '../../plugins/plug-n-play';
import {supportsInput, supportsOutput} from '../../util/device-mode';

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

      socket.on('initialState', function initialState (packet) {
        on().clientStart(packet, mode());
      });
      socket.on('updateState', on().incomingServerPacket);
      socket.on('error', on().error);
      socket.on('playerGroupChange', on().playerGroupChange);

      if (contains(supportsInput, deviceMode())) {
        $()(window()).on('blur', function pauseOnBlue () {
          plugin('PauseBehaviour').pause();
        });
        $()(window()).on('mousedown', function unpauseOnMouseDown () {
          plugin('PauseBehaviour').unpause();
        });
        $()(window()).on('keydown', function unpauseOnKeyDown () {
          get('PauseBehaviour', 'unpause')();
        });
        $()(window()).on('touchstart', function upauseOnTouch () {
          get('PauseBehaviour', 'unpause')();
        });

        define('OnOutgoingClientPacket', function SocketClient () {
          return function sendPacketToServer (packet) {
            socket.emit('input', packet);
          };
        });
      }

      if (contains(supportsOutput, deviceMode())) {
        define('OnIncomingServerPacket', function SocketClient () {
          return function ackPacket (packet) {
            socket.emit('ack', packet.id);
          };
        });
      }

      define('PauseBehaviour', function PauseBehaviour () {
        return {
          pause: function pause () {
            if (contains(supportsInput, deviceMode())) {
              socket.emit('pause');
            }
          },
          unpause: function unpause () {
            if (contains(supportsInput, deviceMode())) {
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
    }

    return {
      connect: connect
    };
  }
};