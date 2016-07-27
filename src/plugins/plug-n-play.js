'use strict';

let loader = require('./folder-loader.js');
let isArray = require('lodash').isArray;
let isString = require('lodash').isString;
let isFunction = require('lodash').isFunction;
let map = require('lodash').map;
let includes = require('lodash').includes;
let logging = require('../logging/shared/logger');

let log;
let plugins = {};
let defaultModes = [];

export function plugin (name) {
  if (!plugins[name]) {
    log.error({name, loaded: Object.keys(plugins)}, 'Plugin not found.');
    throw new Error(`No plugin defined for: "${name}"`);
  }

  return plugins[name];
}

export function unload (name) {
  delete plugins[name];
}

export function get (p, f) {
  return function () {
    if (!plugin(p)[f]) {
      log.error({plugin: Object.keys(p), f: f}, 'Attempted to execute function not found on plugin.');
      return undefined;
    }

    return plugin(p)[f](...arguments);
  };
}

function deferredDependency (deferred) {
  return function deferredWrapper () {
    if (arguments.length > 0) {
      throw new Error('Incorrect use of deferred dependency. You\'re using: dep(p1, p2), when you should be using: dep()(p1, p2).');
    }

    return plugin(deferred);
  };
}

function setModesForPlugin (p, type) {
  if (!includes(defaultModes, type)) {
    return p;
  }
  if (!(p instanceof Array)) {
    return [['*'], p];
  }
  if (!(p[0] instanceof Array)) {
    return [[p[0]], p[1]];
  }

  return p;
}

function wrapOriginalFunction (original) {
  return original;
}

function wrapEachElementOfArray (array, prefix, type) {
  return map(array, function wrapIfFunction (element) {
    if (element instanceof Function) {
      return wrapOriginalFunction(element, undefined, prefix, type);
    }

    return element;
  });
}

function wrapEachFunctionInObject (obj, prefix, type) {
  for (var key in obj) {
    if (obj[key] instanceof Function) {
      obj[key] = wrapOriginalFunction(obj[key], key, prefix, type);
    }
  }

  return obj;
}

function addLoggingToPlugin (module, prefix, args) {
  var p = module.func(...args);

  if (p instanceof Function) {
    return wrapOriginalFunction(p, module.name, prefix, module.type);
  }
  if (p instanceof Array) {
    return wrapEachElementOfArray(p, prefix, module.type);
  }
  if (!(p instanceof Object)) {
    return p;
  }

  return wrapEachFunctionInObject(p, prefix, module.type);
}

function checkModuleValidity (module) {
  if (!isString(module.type)) {
    log.error({plugin: module}, 'Attempted to load plugin with invalid type. It must be a string.');
    throw new Error('Attempted to load plugin with invalid type. It must be a string.');
  }
  if (!module.func) {
    log.error({plugin: module}, 'Attempted to load plugin without function.');
    throw new Error('Attempted to load plugin without function.');
  }
  if (!isFunction(module.func)) {
    log.error({plugin: module}, 'Attempted to load plugin with invalid function.');
    throw new Error('Attempted to load plugin with invalid function.');
  }
}

function loadSensibleDefaults (module) {
  module.deps = module.deps || [];
  if (!isArray(module.deps)) {
    module.deps = [module.deps];
  }

  return module;
}

function load (module, prefix = ' ensemblejs') {
  if (!module.type) {
    return;
  }

  checkModuleValidity(module);

  let m = loadSensibleDefaults(module);
  m.name = logging.extractFunctionNameFromCode(m.func);

  log.loaded(prefix, m.type, m.func);

  var args = map(m.deps, function (dep) {
    return deferredDependency(dep);
  });

  var preparedPlugin = setModesForPlugin(
    addLoggingToPlugin(m, prefix, args),
    m.type
  );

  if (isArray(plugins[m.type])) {
    plugins[m.type].push(preparedPlugin);
  } else {
    if (plugins[m.type]) {
      log.warn({plugin: m}, 'Plugin has been loaded more than once. The latter calls will replace the former.');
    }

    plugins[m.type] = preparedPlugin;
  }
}

function loadGameDevCode (path) {
  loader.loadFromPath(path, load, 'Game');
}

function loadFrameworkPath (path) {
  loader.loadFromPath(path, load, ' ensemblejs');
}

export function set (name, thing) {
  plugins[name] = thing;
}

export function boilerplate (type, deps, func) {
  return (deps instanceof Function) ? {type, func: deps} : {type, deps, func};
}

export default function define (type, deps, func) {
  load(boilerplate(type, deps, func));
}

export function configure (logger, arrays = [], defaultMode = [], traceOnlyPlugins = []) {
  log = logging.setupLogger(logger);

  arrays.forEach(name => (plugins[name] = []));

  defaultModes = defaultMode;
  logging.traceOnly(traceOnlyPlugins);

  plugins.Logger = log;

  load({ type: 'DefinePlugin', func: () => define });
  load({ type: 'DynamicPluginLoader', func: () => ({ get: plugin }) });

  return {
    load, loadFrameworkPath, loadPath: loadGameDevCode, set, get: plugin
  };
}