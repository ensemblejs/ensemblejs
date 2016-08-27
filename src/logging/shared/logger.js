'use strict';

let log;
let lowerToTrace = [];

const includes = require('lodash/includes');
const isFunction = require('lodash/isFunction');

function filename (fullPath, dirname) {
  return fullPath.replace(dirname, '').replace('/', '');
}

function extractFunctionNameFromCode (code) {
  if (!code) {
    return 'anonymous';
  }

  if (isFunction(code)) {
    return code.name;
  }

  const name = code.toString();
  const start = name.indexOf(' ') + 1;
  const finish = name.indexOf('(');

  const extracedName = name.substring(start, finish);
  if (extracedName.length === 0) {
    return 'anonymous';
  }

  return extracedName;
}


function extractFunctionNameWithParamsFromCode (code) {
  if (!code) {
    return 'anonymous';
  }

  const name = code.toString();
  const start = name.indexOf(' ') + 1;
  const finish = name.indexOf(')') + 1;

  const extracedName = name.substring(start, finish);
  if (extracedName.length === 0) {
    return 'anonymous';
  }

  return extracedName;
}

function loaded (namespace, type, func) {
  log.info(`${namespace}:${type}:${extractFunctionNameFromCode(func)} loaded`);
}

function called (args, namespace, module, code) {
  const n = `${namespace}:${module}:${extractFunctionNameFromCode(code)}`;

  if (includes(lowerToTrace, module)) {
    log.trace(args, n);
  } else {
    log.info(n);
    log.debug(args, n);
  }
}

function trace (args, file, code) {
  log.trace(args, `${file}:${extractFunctionNameWithParamsFromCode(code)}`);
}

const discard = () => undefined;

function deprecate (method, message) {
  return function deprecationNotice () {
    log.warn({method, message}, 'Method deprecated.');
  };
}

function unsupported (method, message) {
  log.error({method, message}, 'Method no longer supported.');
}

function ensureNotNull (param, message) {
  if (!param) {
    log.error(message);
  }
}

function discardLower (logger) {
  switch(logger.logLevel) {
    case 'debug':
      logger.trace = discard;
      break;
    case 'info':
      logger.trace = discard;
      logger.debug = discard;
      break;
    case 'warn':
      logger.trace = discard;
      logger.debug = discard;
      logger.info = discard;
      break;
    case 'error':
      logger.trace = discard;
      logger.debug = discard;
      logger.info = discard;
      logger.warn = discard;
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

module.exports = { extractFunctionNameFromCode, setupLogger, traceOnly: setTraceOnly};