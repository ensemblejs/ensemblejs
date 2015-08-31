'use strict';

var isArray = require('lodash').isArray;
var zepto = require('zepto-browserify').$;

zepto.id = function id (key) {
  if (isArray(key)) {
    return zepto('#' + key.join('_'));
  } else {
    return zepto('#' + key);
  }
};

module.exports = {
  type: '$',
  func: function $ () { return zepto; }
};