'use strict';

var appRoot = require('app-root-path');
var defaultsDeep = require('lodash').defaultsDeep;
var select = require('lodash').select;
var once = require('lodash').once;
var logger = require('../logging/server/logger').logger;

function getConfig () {
  var config = {};

  try {
    config = require(appRoot + '/config.json');
    logger.info('Using custom config.');
  } catch (error) {
    logger.info('Not using custom config.');
  }

  config = defaultsDeep(config, require('../../config/defaults.json'));
  config.nothing = function nothing () {};

  function minPlayers (mode) {
    if (config[mode] && config[mode].minPlayers) {
      return config[mode].minPlayers;
    }

    return config.ensemble.minPlayers;
  }

  function maxPlayers (mode) {
    if (config[mode] && config[mode].maxPlayers) {
      return config[mode].maxPlayers;
    }

    return config.ensemble.maxPlayers;
  }

  function createCheckForValidPlayerCounts (originalFunction) {
    return function checkForValidPlayerCounts (mode) {
      if (minPlayers(mode) > maxPlayers(mode)) {
        logger.error('minPlayers for "' + mode + '" (' + minPlayers(mode) + ') is greater than the maxPlayers (' + maxPlayers(mode) + ') property.');
      }

      return originalFunction(mode);
    };
  }

  function anyDebugTrue () {
    return select(config.debug, function (value) {
      return value;
    }).length > 0;
  }

  config.minPlayers = createCheckForValidPlayerCounts(minPlayers);
  config.maxPlayers = createCheckForValidPlayerCounts(maxPlayers);
  config.debug.enabled = anyDebugTrue();

  logger.info(config, 'Initial Configuration');

  return config;
}

module.exports = {
  get: once(getConfig)
};