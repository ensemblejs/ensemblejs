'use strict';

var sinon = require('sinon');

module.exports = {
  timer: function () {
    return {
      fromHere: sinon.spy(),
      toHere: sinon.spy(),
      track: sinon.spy(),
      results: sinon.spy()
    };
  }
};