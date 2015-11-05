'use strict';

var zepto = require('zepto-browserify').$;

module.exports = {
  type: '$',
  func: function $ () { return zepto; }
};