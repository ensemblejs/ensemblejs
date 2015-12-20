'use strict';

var io = require('socket.io-client');
var last = require('lodash').last;

module.exports = {
  type: 'SocketClient',
  deps: ['Window', 'GameMode', 'ServerUrl', 'On', 'DefinePlugin', 'Time', '$'],
  func: function SocketClient (window, gameMode, host, on, define, time, $) {

    function url () {
      return host() + '/' + gameMode() + '/primary';
    }

    function connect () {
      var socket = io.connect(url(), { reconnection: false });

      var gameId = last(window().location.pathname.split('/'));
      socket.emit('gameId', gameId);

      socket.on('startTime', function (serverOffset) {
        var currentClientTime = time().present();
        time().setOffset(serverOffset - currentClientTime);
      });
      socket.on('connect', function connect () {
        on().connect('client', gameMode());
      });
      socket.on('disconnect', function disconnect () {
        on().disconnect('client', gameMode());
      });

      socket.on('playerNumber', function savePlayerId (playerNumber) {
        if (!playerNumber) {
          window().location.replace('/games/' + gameId + '/full');
        }

        on().clientPlayerId(playerNumber);
      });

      socket.on('initialState', function initialState (packet) {
        on().clientStart(packet, gameMode());
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