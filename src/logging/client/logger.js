'use strict';

var includes = require('lodash').includes;

function discard () {}

var logger = {
    trace: discard,
    debug: discard,
    info: discard,
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

function info (msg) {
    var background = 'white';
    var text = 'black';
    if (includes(msg, ':On')) {
      background = '#00b988';
    }
    if (includes(msg, 'Game:')) {
      background = 'lightgreen';
    }

    console.info(`%c${msg}`, `background: ${background}; color: ${text};`);
}

function traceLogging () {
    logger.trace = console.log.bind(console);
    logger.debug = console.log.bind(console);
    logger.info = info;
    logger.warn = console.warn.bind(console);
}

function debugLogging () {
    logger.trace = discard;
    logger.debug = console.log.bind(console);
    logger.info = info;
    logger.warn = console.warn.bind(console);
}

function infoLogging() {
    logger.trace = discard;
    logger.debug = discard;
    logger.info = info;
    logger.warn = console.warn.bind(console);
}

function warnLogging() {
    logger.trace = discard;
    logger.debug = discard;
    logger.info = discard;
    logger.warn = console.warn.bind(console);
}

function errorLogging() {
    logger.trace = discard;
    logger.debug = discard;
    logger.info = discard;
    logger.warn = discard;
}

var logLevelSetup = {
    trace: traceLogging,
    debug: debugLogging,
    info: infoLogging,
    warn: warnLogging,
    error: errorLogging
};

function setLogLevel (level) {
    logLevelSetup[level]();
}

module.exports = {
  logger: logger,
  setLogLevel: setLogLevel
};