'use strict';

import requireInject from 'require-inject';

var each = require('lodash').each;
var sinon = require('sinon');

var fakeDetermineDeviceId = require('./fake/determine-device-id');
var fakeDeterminePlayerId = require('./fake/determine-player-id');
var fakeI18n = require('./fake/i18n');
var fakeLogger = require('./fake/logger');

var pathToSrc = '../src/';

export function defer (dep) {
  return function wrapDep () {
    return dep;
  };
}

export function plugin () {
  var deps = {};

  function define (type) {
    let dep = arguments[arguments.length - 1];

    deps[type] = deps[type] ? [deps[type]].concat(dep) : dep;
  }

  function reset () {
    deps = {};
  }

  function get () {
    let theDeps = deps;
    reset();
    return theDeps;
  }

  return {
    reset: reset,
    deps: get,
    define: define
  };
}

export const makeTestible = (pathToModule, explicitDeps = {}, nodeDeps = {}) => {
  var deps = [];
  var support = plugin();
  var requiredPlugin = requireInject(pathToSrc + pathToModule, nodeDeps);

  var defaultStubs = {
    'DefinePlugin': support.define,
    'SocketServer': { start: sinon.spy(), stop: sinon.spy() },
    'WebServerMiddleware': [fakeDetermineDeviceId, fakeDeterminePlayerId, fakeI18n],
    'Routes': [],
    'Logger': fakeLogger
  };

  each(requiredPlugin.deps, dep => {
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
};

export const requirePlugin = makeTestible;

export function gameScopedState (stateCallback) {
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

export function DynamicPluginLoader (plugins) {
  return {
    get: function (name) { return plugins[name]; }
  };
}