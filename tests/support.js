'use strict';

var each = require('lodash').each;
var sinon = require('sinon');

var pathToSrc = '../src/';

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

function makeTestible(pathToModule, explicitDeps) {
  var deps = [];
  var support = plugin();
  var requiredPlugin = require(pathToSrc + pathToModule);

  each(requiredPlugin.deps, function (dep) {
    if (explicitDeps[dep]) {
      deps.push(defer(explicitDeps[dep]));
      return;
    }

    if (dep === 'DefinePlugin') {
      deps.push(defer(support.define));
    } else {
      deps.push(defer(sinon.spy()));
    }
  });

  return [requiredPlugin.func.apply(undefined, deps), support.deps()];
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

function gameScopedState (stateCallback) {
  return {
    for: function (namespace) {
      return {
        get: function (key) {
          return stateCallback()[namespace][key];
        }
      };
    }
  };
}

function DynamicPluginLoader (plugins) {
  return function getter () {
    return {
      get: function (name) { return plugins[name]; }
    };
  };
}

module.exports = {
  makeTestible: makeTestible,
  defer: defer,
  plugin: plugin,
  logger: logger,
  gameScopedState: gameScopedState,
  DynamicPluginLoader: DynamicPluginLoader
};