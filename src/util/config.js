'use strict';

require('requirish')._(module);
var appRoot = require('app-root-path');
var defaultsDeep = require('lodash').defaultsDeep;

function getConfig (logger) {
  var config = {};

  try {
    config = require(appRoot + '/config.json');
    logger.info('Using custom config.');
  } catch (error) {
    logger.info('Not using custom config.');
  }

  config = defaultsDeep(config, require('../../config/defaults.json'));
  config.nothing = function nothing () {};
  logger.info(config, 'Initial Configuration');

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

  config.minPlayers = createCheckForValidPlayerCounts(minPlayers);
  config.maxPlayers = createCheckForValidPlayerCounts(maxPlayers);

  return config;
}

module.exports = getConfig;