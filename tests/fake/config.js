'use strict';

var config = require('../../src/util/config');
var get = config.get;
var defaultStub = {
  debug: {
    develop: false
  },
  logging: {
    expressBunyanLogger: {
      excludes: []
    }
  }
};

function stub (props) {
  props = props || defaultStub;
  config.get = function fakeGet () {
    return props;
  };
}

function restore () {
  config.get = get;
}

module.exports = {
  stub: stub,
  restore: restore
};