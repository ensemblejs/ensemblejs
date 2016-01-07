'use strict';

var io = require('socket.io-client');
var last = require('lodash').last;

module.exports = {
  type: 'SocketClient',
  deps: ['Window', 'SaveMode', 'ServerUrl', 'On', 'DefinePlugin', 'Time', '$'],
  func: function SocketClient (window, mode, host, on, define, time, $) {

    function url () {
      return host() + '/' + mode() + '/primary';
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

      $()(window()).on('blur', function () { socket.emit('pause'); });
      $()(window()).on('mousedown', function () { socket.emit('unpause'); });
      $()(window()).on('keydown', function () { socket.emit('unpause'); });
      $()(window()).on('touchstart', function () { socket.emit('unpause'); });

      define()('OnOutgoingClientPacket', function SocketClient () {
        return function sendPacketToServer (packet) {
          socket.emit('input', packet);
        };
      });

      define()('OnIncomingServerPacket', function SocketClient () {
        return function ackPacket (packet) {
          socket.emit('ack', packet.id);
        };
      });
    }

    return {
      connect: connect
    };
  }
};