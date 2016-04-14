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

function socket (eventName) {
  logger.info(` ensemblejs::socket:${eventName}`);
}

logger.socket = socket;

export default {
  logger: logger
};