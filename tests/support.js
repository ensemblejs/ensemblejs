'use strict';

var sinon = require('sinon');

function defer (dep) {
  return function wrapDep () {
    return dep;
  };
}

function plugin () {
  var deps = {};

  function define (type, a, b) {
    if (arguments.length === 2) {
      deps[type] = a;
    } else {
      deps[type] = b;
    }
  }

  function reset () {
    deps = {};
  }

  function get () {
    return deps;
  }

  return {
    reset: reset,
    deps: get,
    define: define
  };
}

var logger = {
  loaded: sinon.spy(),
  plugin: sinon.spy(),
  subdue: sinon.spy(),
  called: sinon.spy(),
  debug: sinon.spy(),
  filename: sinon.spy(),
  info: sinon.spy(),
  warn: sinon.spy()
};

module.exports = {
  defer: defer,
  plugin: plugin,
  logger: logger
};