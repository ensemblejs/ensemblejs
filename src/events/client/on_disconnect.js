'use strict';

module.exports = {
  type: 'OnDisconnect',
  func: function OnDisconnect () {
    var $ = require('zepto-browserify').$;

    return function showDisconnectIcon () {
      $('.disconnected').show();
    };
  }
};