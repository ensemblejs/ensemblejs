'use strict';

var present = require('present');

module.exports = {
  type: 'Time',
  func: function Time () {
    return {
      present: present
    };
  }
};