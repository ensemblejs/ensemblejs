'use strict';

var icon = require('../../public/partials/disconnect-icon.jade');

module.exports = {
  type: 'ConnectDisconnect',
  deps: ['DefinePlugin'],
  func: function ConnectDisconnect (define) {

    define()('OnClientReady', ['$'], function ConnectDisconnect ($) {
      return function setup () {
        $()('.icons').append(icon());
      };
    });

    define()('OnResize', ['$'], function ConnectDisconnect ($) {
      return function reposition (dims) {
        if (dims.orientation === 'landscape') {
          $()('.disconnected').css('top', '64px').css('right', '0');
        } else {
          $()('.disconnected').css('right', '64px').css('top', '0');
        }
      };
    });

    define()('OnConnect', ['$'], function ConnectDisconnect ($) {
      return function hideDisconnectIcon () {
        $()('.disconnected').hide();
      };
    });

    define()('OnDisconnect', ['$'], function ConnectDisconnect ($) {
      return function showDisconnectIcon () {
        $()('.disconnected').show();
      };
    });
  }
};