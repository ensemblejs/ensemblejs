'use strict';

var sinon = require('sinon');

module.exports = {
  at: function seedTimeAt(time) {
    return {
      present: function () { return time; },
      setOffset: sinon.spy()
    };
  }
};