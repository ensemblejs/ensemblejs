'use strict';

function discard () {}

var logger = {
    trace: discard,
    debug: discard,
    info: discard,
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

function traceLogging () {
    logger.trace = console.log.bind(console);
    logger.debug = console.log.bind(console);
    logger.info = console.info.bind(console);
    logger.warn = console.warn.bind(console);
}

function debugLogging () {
    logger.trace = discard;
    logger.debug = console.log.bind(console);
    logger.info = console.info.bind(console);
    logger.warn = console.warn.bind(console);
}

function infoLogging() {
    logger.trace = discard;
    logger.debug = discard;
    logger.info = console.info.bind(console);
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