'use strict';

var uuid = require('node-uuid');

module.exports = {
  type: 'UUID',
  func: function UUID () {
    return {
      gen: uuid.v4
    };
  }
};