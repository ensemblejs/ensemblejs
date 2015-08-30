'use strict';

var appRoot = require('app-root-path');
var rekuire = require('rekuire');
var defaultsDeep = require('lodash').defaultsDeep;

function getConfig (logger) {
  var config = {};

  try {
    config = require(appRoot + '/config.json');
    logger.info('Using custom config.');
  } catch (error) {
    logger.info('Not using custom config.');
  }

  config = defaultsDeep(config, rekuire('config/defaults.json'));
  config.nothing = function nothing () {};
  logger.info(config, 'Initial Configuration');

  return config;
}

module.exports = getConfig;