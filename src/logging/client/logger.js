'use strict';

function discard () {}

var logger = {
    trace: discard,
    debug: discard,
    info: discard,
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

function setLogLevel (level) {
    switch(level) {
        case 'trace':
            logger.trace = console.log.bind(console);
            logger.debug = console.log.bind(console);
            logger.info = console.info.bind(console);
            logger.warn = console.warn.bind(console);
            break;
        case 'debug':
            logger.trace = discard;
            logger.debug = console.log.bind(console);
            logger.info = console.info.bind(console);
            logger.warn = console.warn.bind(console);
            break;
        case 'info':
            logger.trace = discard;
            logger.debug = discard;
            logger.info = console.info.bind(console);
            logger.warn = console.warn.bind(console);
            break;
        case 'warn':
            logger.trace = discard;
            logger.debug = discard;
            logger.info = discard;
            logger.warn = console.warn.bind(console);
            break;
        case 'error':
            logger.trace = discard;
            logger.debug = discard;
            logger.info = discard;
            logger.warn = discard;
            break;
        default:
            logger.trace = discard;
            logger.debug = discard;
            logger.info = discard;
            logger.warn = console.warn.bind(console);
    }
}

module.exports = {
  logger: logger,
  setLogLevel: setLogLevel
};