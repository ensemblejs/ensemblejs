'use strict';

var loader = require('./folder-loader.js');
var isArray = require('lodash').isArray;
var isString = require('lodash').isString;
var isFunction = require('lodash').isFunction;
var each = require('lodash').each;
var map = require('lodash').map;
var contains = require('lodash').contains;
var logging = require('../logging/shared/logger');
var log;
var plugins = {};
var defaultModes = [];
var traceOnly = [];

function get (name) {
  if (!plugins[name]) {
    throw new Error('No plugin defined for: ' + name);
  }

  return plugins[name];
}

function getIfExists (name) {
  return plugins[name];
}

function deferredDependency (deferred) {
  return function deferredWrapper () {
    if (arguments.length > 0) {
      throw new Error('Incorrect use of deferred dependency. You\'re using: dep(p1, p2), when you should be using: dep()(p1, p2).');
    }

    return get(deferred);
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

  if (profiler) {
    func = func || 'anonymous';
    return profiler.timer(prefix, plugin, func, 100);
  } else {
    return undefined;
  }
}

function isNotProfileExclusion(type) {
  return type !== 'Time';
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
    return wrapOriginalFunction(plugin, undefined, prefix, module.type);
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
  if (!module.type) {
    throw new Error('Attempted to load plugin without type');
  }
  if (!isString(module.type)) {
    throw new Error('Attempted to load plugin "' + module.type + '" with invalid type. It must be a string.');
  }
  if (!module.func) {
    throw new Error('Attempted to load plugin "' + module.type + '" without function');
  }
  if (!isFunction(module.func)) {
    throw new Error('Attempted to load plugin "' + module.type + '" with invalid function.');
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
  checkModuleValidity(module);

  module = loadSensibleDefaults(module);

  prefix = prefix || 'ensemblejs';

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
      log.warn('Plugin "' + module.type + '" has been loaded more than once. The latter calls will replace the former.');
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

function define (type, deps, func) {
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

function configure (logger, arrays, defaultMode, traceOnlyPlugins) {
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
      return function loadDefinedPlugin (type, deps, func) {
        load(define(type, deps, func));
      };
    }
  });

  load({
    type: 'DynamicPluginLoader',
    func: function DynamicPluginLoader () {
      return {
        get: get
      };
    }
  });

  return {
    load: load,
    loadFrameworkPath: loadFrameworkPath,
    loadPath: loadGameDevCode,
    set: set,
    get: get
  };
}

module.exports = {
  configure: configure
};