'use strict';

import requireInject from 'require-inject';

const each = require('lodash').each;
const sinon = require('sinon');

const fakeDetermineDeviceId = require('./fake/determine-device-id');
const fakeDeterminePlayerId = require('./fake/determine-player-id');
const fakeI18n = require('./fake/i18n');
const fakeLogger = require('./fake/logger');

const pathToSrc = '../src/';

export function defer (dep) {
  return function wrapDep () {
    return dep;
  };
}

export function plugin () {
  let deps = {};

  function define (type) {
    const dep = arguments[arguments.length - 1];

    deps[type] = deps[type] ? [deps[type]].concat(dep) : dep;
  }

  function reset () {
    deps = {};
  }

  function get () {
    const theDeps = deps;
    reset();
    return theDeps;
  }

  return {
    reset,
    deps: get,
    define
  };
}

export function capture () {
  let deps = {};

  function define (type, ...rest) {
    const dep = rest[rest.length - 1];

    deps[type] = deps[type] ? [deps[type]].concat(dep) : dep;
  }

  return {
    deps: () => deps,
    reset: () => (deps = {}),
    define
  };
}

export const makeTestible = (pathToModule, explicitDeps = {}, nodeDeps = {}) => {
  const deps = [];
  const support = plugin();
  const requiredPlugin = requireInject(pathToSrc + pathToModule, nodeDeps);

  const defaultStubs = {
    'DefinePlugin': support.define,
    'SocketServer': { start: sinon.spy(), stop: sinon.spy() },
    'WebServerMiddleware': [fakeDetermineDeviceId, fakeDeterminePlayerId, fakeI18n],
    'Routes': [],
    'Logger': fakeLogger
  };

  each(requiredPlugin.deps, (dep) => {
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

export const requirePlugin = (...params) => makeTestible(...params)[0];

export function gameScopedState (stateCallback) {
  return {
    for: (namespace) => ({
      get: (key) => stateCallback()[namespace][key]
    }),
    get: (key) => stateCallback()[key]
  };
}

export function DynamicPluginLoader (plugins) {
  return {
    get: (name) => plugins[name]
  };
}