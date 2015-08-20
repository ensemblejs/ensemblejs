'use strict';

module.exports = {
  type: 'OnConnect',
  func: function OnConnect () {
    var $ = require('zepto-browserify').$;

    return function hideDisconnectIcon () {
      $('.disconnected').hide();
    };
  }
};