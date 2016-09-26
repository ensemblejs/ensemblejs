'use strict';

const appRoot = require('app-root-path');
const packageInfo = require(`${appRoot}/package.json`);

console.debug = function(msg) { console.log(msg) }

export const logger = console

export const setLogLevel = (config) => {
  logger.logLevel = config.logging.logLevel;
}