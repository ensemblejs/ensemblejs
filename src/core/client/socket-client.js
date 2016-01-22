'use strict';

var io = require('socket.io-client');
import {last} from 'lodash/array';
import {contains} from 'lodash/collection';

import {supportsInput, supportsOutput} from '../../util/device-mode';

module.exports = {
  type: 'SocketClient',
  deps: ['Window', 'SaveMode', 'ServerUrl', 'On', 'DefinePlugin', 'Time', '$', 'DeviceMode'],
  func: function SocketClient (window, mode, host, on, define, time, $, deviceMode) {

    function url () {
      return host() + '/' + mode() + '/' + deviceMode();
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

      var pause = function pause () {};
      var resume = function resume () {};
      var toggle = function toggle () {};

      if (contains(supportsInput, deviceMode())) {
        pause = function pause () {
          socket.emit('pause');
        };
        resume = function resume () {
          socket.emit('unpause');
        };
        toggle = function toggle (state) {
          console.log('toggle pause');
          return state.get('ensemble.paused') ? resume() : pause();
        };

        $()(window()).on('blur', function () { pause(); });
        $()(window()).on('mousedown', function () { resume(); });
        $()(window()).on('keydown', function () { resume(); });
        $()(window()).on('touchstart', function () { resume(); });

        define()('OnOutgoingClientPacket', function SocketClient () {
          return function sendPacketToServer (packet) {
            socket.emit('input', packet);
          };
        });
      }

      if (contains(supportsOutput, deviceMode())) {
        define()('OnIncomingServerPacket', function SocketClient () {
          return function ackPacket (packet) {
            socket.emit('ack', packet.id);
          };
        });
      }

      define()('PauseBehaviour', function () {
        return {
          pause: pause,
          resume: resume,
          toggle: toggle
        };
      });
    }

    return {
      connect: connect
    };
  }
};