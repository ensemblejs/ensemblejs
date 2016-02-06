'use strict';

var zepto = require('zepto-browserify').$;

export default zepto;

module.exports = {
  type: '$',
  func: function $ () { return zepto; }
};