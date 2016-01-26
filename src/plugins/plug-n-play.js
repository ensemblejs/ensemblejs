'use strict';

let loader = require('./folder-loader.js');
let isArray = require('lodash').isArray;
let isString = require('lodash').isString;
let isFunction = require('lodash').isFunction;
let each = require('lodash').each;
let map = require('lodash').map;
let contains = require('lodash').contains;
let logging = require('../logging/shared/logger');

let log;
let plugins = {};
let defaultModes = [];
let traceOnly = [];

export function plugin (name) {
  if (!plugins[name]) {
    log.error({module: module}, 'Plugin not found.');
    throw new Error('No plugin defined for: "' + name + '"');
  }

  return plugins[name];
}

export function unload (name) {
  delete plugins[name];
}

export function get (p, f) {
  return function () {
    if (!plugin(p)[f]) {
      log.error({plugin: p.keys(), f: f}, 'Attempted to execute function not found on plugin.');
      return;
    }

    return plugin(p)[f](...arguments);
  };
}

function getIfExists (name) {
  return plugins[name];
}

function deferredDependency (deferred) {
  return function deferredWrapper () {
    if (arguments.length > 0) {
      throw new Error('Incorrect use of deferred dependency. You\'re using: dep(p1, p2), when you should be using: dep()(p1, p2).');
    }

    return plugin(deferred);
  };
}

function setModesForPlugin (plugin, type) {
  if (!contains(defaultModes, type)) {
    return plugin;
  }
  if (!(plugin instanceof Array)) {
    return [['*'], plugin];
  }
  if (!(plugin[0] instanceof Array)) {
    return [[plugin[0]], plugin[1]];
  }

  return plugin;
}

function createTimer (prefix, plugin, func) {
  var profiler = getIfExists('Profiler');
  var timer = getIfExists('Timer');

  if (timer) {
    func = func || 'anonymous';
    return profiler.timer(prefix, plugin, func, 1);
  } else {
    return undefined;
  }
}

function isNotProfileExclusion(type) {
  return type !== 'Time' && type !== 'Timer';
}

function wrapOriginalFunction (original, key, prefix, type) {
  var timer = createTimer(prefix, type, key);

  return function wrappedWithLoggingAndTimers () {
    if (contains(traceOnly, type)) {
      log.subdue(arguments, prefix + ':' + type, original.toString());
    } else {
      log.plugin(arguments, prefix, type, original.toString());
    }

    if (timer && isNotProfileExclusion(type)) {
      timer.fromHere();
      var result = original.apply(this, arguments);
      timer.toHere();
      return result;
    } else {
      return original.apply(this, arguments);
    }
  };
}

function wrapEachElementOfArray (array, prefix, type) {
  return map(array, function wrapIfFunction (element) {
    if (element instanceof Function) {
      return wrapOriginalFunction(element, undefined, prefix, type);
    } else {
      return element;
    }
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
  var plugin = module.func.apply(undefined, args);

  if (plugin instanceof Function) {
    return wrapOriginalFunction(plugin, module.name, prefix, module.type);
  }
  if (plugin instanceof Array) {
    return wrapEachElementOfArray(plugin, prefix, module.type);
  }
  if (!(plugin instanceof Object)) {
    return plugin;
  } else {
    return wrapEachFunctionInObject(plugin, prefix, module.type);
  }
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

function load (module, prefix) {
  if (!module.type) {
    return;
  }

  checkModuleValidity(module);

  module = loadSensibleDefaults(module);

  prefix = prefix || 'ensemblejs';
  module.name = logging.extractFunctionNameFromCode(module.func);

  log.loaded(prefix, module.type, module.func);

  var args = map(module.deps, function (dep) {
    return deferredDependency(dep);
  });

  var preparedPlugin = setModesForPlugin(
    addLoggingToPlugin(module, prefix, args),
    module.type
  );

  if (isArray(plugins[module.type])) {
    plugins[module.type].push(preparedPlugin);
  } else {
    if (plugins[module.type]) {
      log.warn({plugin: module}, 'Plugin has been loaded more than once. The latter calls will replace the former.');
    }

    plugins[module.type] = preparedPlugin;
  }
}

function loadGameDevCode (path) {
  loader.loadFromPath(path, load, 'Game');
}

function loadFrameworkPath (path) {
  loader.loadFromPath(path, load, 'ensemblejs');
}

function set (name, thing) {
  plugins[name] = thing;
}

export function boilerplate (type, deps, func) {
  if (deps instanceof Function) {
    return {
      type: type,
      func: deps
    };
  } else {
    return {
      type: type,
      deps: deps,
      func: func
    };
  }
}

export default function define (type, deps, func) {
  load(boilerplate(type, deps, func));
}

export function configure (logger, arrays, defaultMode, traceOnlyPlugins) {
  log = logging.setupLogger(logger);

  arrays = arrays || [];
  defaultMode = defaultMode || [];
  traceOnlyPlugins = traceOnlyPlugins || [];

  each(arrays, function(name) {
    plugins[name] = [];
  });

  defaultModes = defaultMode;
  traceOnly = traceOnlyPlugins;
  logging.traceOnly(traceOnlyPlugins);

  plugins.Logger = log;

  load({
    type: 'DefinePlugin',
    func: function DefinePlugin () {
      return define;
    }
  });

  load({
    type: 'DynamicPluginLoader',
    func: function DynamicPluginLoader () {
      return {
        get: plugin
      };
    }
  });

  return {
    load: load,
    loadFrameworkPath: loadFrameworkPath,
    loadPath: loadGameDevCode,
    set: set,
    get: plugin
  };
}