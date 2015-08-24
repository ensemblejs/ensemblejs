'use strict';

var $ = require('zepto-browserify').$;

module.exports = {
  deps: ['Window', 'GameMode', 'ServerUrl', 'On', 'DefinePlugin', 'Time'],
  type: 'SocketClient',
  func: function SocketClient (window, gameMode, host, on, define, time) {

    function url () {
      return host() + '/' + gameMode() + '/primary';
    }

    function connect () {
      var io = require('socket.io-client');
      var socket = io.connect(url(), { reconnection: false });

      socket.on('startTime', function (serverOffset) {
        var currentClientTime = time().present();
        time().setOffset(serverOffset - currentClientTime);
      });
      socket.on('connect', on().connect);
      socket.on('disconnect', function () {
        on().disconnect('client', gameMode());
      });

      socket.on('playerId', function savePlayerId (playerId) {
        socket.playerId = playerId;
      });

      socket.on('initialState', on().setup);
      socket.on('updateState', on().serverPacket);
      socket.on('error', on().error);

      if (window().document.hasFocus()) { socket.emit('unpause'); }
      $(window()).on('blur', function () { socket.emit('pause'); });
      $(window()).on('focus', function () { socket.emit('unpause'); });
      $(window()).on('mousedown', function () { socket.emit('unpause'); });
      $(window()).on('mouseup', function () { socket.emit('unpause'); });

      define()('OnClientPacket', function SocketClient () {
        return function sendPacketToServer (packet) {
          socket.emit('input', packet);
        };
      });
    }

    return {
      connect: connect
    };
  }
};