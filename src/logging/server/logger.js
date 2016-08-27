'use strict';

const appRoot = require('app-root-path');
const packageInfo = require(`${appRoot}/package.json`);

export const logger = require('bunyan').createLogger({
  name: packageInfo.name,
  version: packageInfo.version,
  streams: [{ level: 'debug', stream: process.stdout }]
});

export const setLogLevel = (config) => {
  logger.logLevel = config.logging.logLevel;
}