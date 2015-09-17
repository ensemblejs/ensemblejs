'use strict';

var icon = require('../../public/partials/disconnect-icon.jade');

module.exports = {
  type: 'ConnectDisconnect',
  deps: ['DefinePlugin', '$'],
  func: function ConnectDisconnect (define, $) {

    function reposition (dims) {
      if (dims.landscape()) {
        $()('.disconnected').css('top', '64px').css('right', '0');
      } else {
        $()('.disconnected').css('right', '64px').css('top', '0');
      }
    }

    define()('OnClientReady', function ConnectDisconnect () {
      return function setup (dims) {
        $()('.icons').append(icon());
        $()('.disconnected').hide();
        reposition(dims);
      };
    });

    define()('OnResize', function ConnectDisconnect () {
      return reposition;
    });

    define()('OnConnect', function ConnectDisconnect () {
      return function hideDisconnectIcon () {
        $()('.disconnected').hide();
      };
    });

    define()('OnDisconnect', function ConnectDisconnect () {
      return function showDisconnectIcon () {
        $()('.disconnected').show();
      };
    });
  }
};