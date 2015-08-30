'use strict';

var log;
var lowerToTrace = [];

var contains = require('lodash').contains;

function filename (fullPath, dirname) {
  return fullPath.replace(dirname, '').replace('/', '');
}

function extractFunctionNameFromCode (code) {
  if (!code) {
    return 'anonymous';
  }

  var name = code.toString();
  var start = name.indexOf(' ') + 1;
  var finish = name.indexOf(')') + 1;

  var extracedName = name.substring(start, finish);
  if (extracedName.length === 0) {
    return 'anonymous';
  }

  return extracedName;
}

function loaded (namespace, type, func) {
  log.info([
    namespace, ':', type, ':', extractFunctionNameFromCode(func),  ' loaded.'
    ].join('')
  );
}

function called (args, namespace, module, code) {
  var n = [namespace, module, extractFunctionNameFromCode(code)].join(':');

  if (contains(lowerToTrace, module)) {
    log.trace(args, n);
  } else {
    log.info(n);
    log.debug(args, n);
  }
}

function trace (args, filename, code) {
  log.trace(args, filename + ':' + extractFunctionNameFromCode(code));
}

function discard () {}

function deprecate (method, message) {
  return function deprecationNotice () {
    log.warn(method + ' is deprecated. ' + message);
  };
}

function unsupported (method, message) {
  log.error(method + ' is no longer supported. ' + message);
}

function ensureNotNull (param, message) {
  if (!param) {
    log.error(message);
  }
}

function setupLogger (logger) {
  log = logger;

  log.filename = filename;
  log.loaded = loaded;
  log.called = called;
  log.plugin = called;
  log.subdue = trace;
  log.deprecate = deprecate;
  log.unsupported = unsupported;
  log.logLevel = logger.logLevel || 'trace';
  log.ensureNotNull = ensureNotNull;

  switch(log.logLevel) {
    case 'debug':
      log.trace = discard;
      break;
    case 'info':
      log.trace = discard;
      log.debug = discard;
      break;
    case 'warn':
      log.trace = discard;
      log.debug = discard;
      log.info = discard;
      break;
    case 'error':
      log.trace = discard;
      log.debug = discard;
      log.info = discard;
      log.warn = discard;
      break;
    default:
      break;
  }

  return log;
}

function setTraceOnly (traceOnly) {
  lowerToTrace = traceOnly;
}

module.exports = {
  setupLogger: setupLogger,
  traceOnly: setTraceOnly
};