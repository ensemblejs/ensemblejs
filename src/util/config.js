'use strict';

var appRoot = require('app-root-path');
var defaultsDeep = require('lodash').defaultsDeep;
var filter = require('lodash').filter;
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

  function handleUnlimited (configuredMax) {
    return configuredMax === 'unlimited' ? Number.MAX_VALUE : configuredMax;
  }

  function maxPlayers (mode) {
    if (config[mode] && config[mode].maxPlayers) {
      return handleUnlimited(config[mode].maxPlayers);
    }

    return handleUnlimited(config.ensemble.maxPlayers);
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
    return filter(config.debug, function (value) {
      return value;
    }).length > 0;
  }

  config.minPlayers = createCheckForValidPlayerCounts(minPlayers);
  config.maxPlayers = createCheckForValidPlayerCounts(maxPlayers);
  config.debug.enabled = anyDebugTrue();
  config.database.host = process.env.DATABASE_HOST || config.database.host;
  config.database.port = process.env.DATABASE_PORT || config.database.port;


  logger.info(config, 'Initial Configuration');

  return config;
}

module.exports = {
  get: once(getConfig)
};