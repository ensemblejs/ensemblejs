'use strict';

var appRoot = require('app-root-path');
var packageInfo = require(appRoot + '/package.json');
export let logger = require('bunyan').createLogger({
  name: packageInfo.name,
  version: packageInfo.version,
  streams: [
    {
      level: 'debug',
      stream: process.stdout
    }
  ]
});

function socket (socketInfo, eventData, eventName) {
  logger.trace([socketInfo, eventData], 'ensemblejs::socket:' + eventName);
  logger.debug(socketInfo, 'ensemblejs::socket:' + eventName);
}

logger.socket = socket;

export default {
  logger: logger
};