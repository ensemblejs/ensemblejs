'use strict';

var log;
var lowerToTrace = [];

var includes = require('lodash').includes;

function filename (fullPath, dirname) {
  return fullPath.replace(dirname, '').replace('/', '');
}

function extractFunctionNameFromCode (code) {
  if (!code) {
    return 'anonymous';
  }

  var name = code.toString();
  var start = name.indexOf(' ') + 1;
  var finish = name.indexOf('(');

  var extracedName = name.substring(start, finish);
  if (extracedName.length === 0) {
    return 'anonymous';
  }

  return extracedName;
}


function extractFunctionNameWithParamsFromCode (code) {
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
    namespace, ':', type, ':', extractFunctionNameWithParamsFromCode(func),  ' loaded.'
    ].join('')
  );
}

function called (args, namespace, module, code) {
  var n = [namespace, module, extractFunctionNameWithParamsFromCode(code)].join(':');

  if (includes(lowerToTrace, module)) {
    log.trace(args, n);
  } else {
    var background = 'white';
    var text = 'black';
    if (includes(n, ':On')) {
      background = '#00b988';
    }
    if (includes(n, 'Game:')) {
      background = 'lightgreen';
    }

    log.info(`%c${n}`, `background: ${background}; color: ${text};`);
    log.debug(args, n);
  }
}

function trace (args, filename, code) {
  log.trace(args, filename + ':' + extractFunctionNameWithParamsFromCode(code));
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

function discardLower (log) {
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

  discardLower(log);

  return log;
}

function setTraceOnly (traceOnly) {
  lowerToTrace = traceOnly;
}

module.exports = {
  extractFunctionNameFromCode: extractFunctionNameFromCode,
  setupLogger: setupLogger,
  traceOnly: setTraceOnly
};