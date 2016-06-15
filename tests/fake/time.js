'use strict';

var sinon = require('sinon');

module.exports = {
  at: function seedTimeAt(time) {
    return {
      present: () => time,
      absolute: () => time,
      setOffset: sinon.spy()
    };
  }
};