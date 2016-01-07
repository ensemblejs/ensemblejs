'use strict';

var each = require('lodash').each;
var sinon = require('sinon');

var fakeDeterminePlayerId = require('./fake/determine-player-id');
var fakeI18n = require('./fake/i18n');

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
  explicitDeps = explicitDeps || {};
  var deps = [];
  var support = plugin();
  var requiredPlugin = require(pathToSrc + pathToModule);

  var defaultStubs = {
    'DefinePlugin': support.define,
    'SocketServer': { start: sinon.spy(), stop: sinon.spy() },
    'WebServerMiddleware': [fakeDeterminePlayerId, fakeI18n],
    'Routes': []
  };

  each(requiredPlugin.deps, function (dep) {
    if (explicitDeps[dep]) {
      deps.push(defer(explicitDeps[dep]));
      return;
    }

    if (defaultStubs[dep]) {
      deps.push(defer(defaultStubs[dep]));
    } else {
      deps.push(defer(sinon.spy()));
    }
  });

  return [requiredPlugin.func.apply(undefined, deps), support.deps()];
}

function gameScopedState (stateCallback) {
  return {
    for: function (namespace) {
      return {
        get: function (key) {
          return stateCallback()[namespace][key];
        }
      };
    },
    get: function (key) {
      return stateCallback()[key];
    }
  };
}

function DynamicPluginLoader (plugins) {
  return {
    get: function (name) { return plugins[name]; }
  };
}

module.exports = {
  makeTestible: makeTestible,
  defer: defer,
  plugin: plugin,
  gameScopedState: gameScopedState,
  DynamicPluginLoader: DynamicPluginLoader
};