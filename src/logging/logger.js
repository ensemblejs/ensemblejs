'use strict';

var appRoot = require('app-root-path');
var packageInfo = require(appRoot + '/package.json');
var logger = require('bunyan').createLogger({
  name: packageInfo.name,
  version: packageInfo.version,
  streams: [
    {
      level: 'debug',
      stream: process.stdout
    }
  ]
});

module.exports = {
  logger: logger
};