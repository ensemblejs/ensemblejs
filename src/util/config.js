'use strict';

const appRoot = require('app-root-path');
const {defaultsDeep} = require('lodash');
const once = require('lodash/once');
const {logger} = require('../logging/server/logger');

function getConfig () {
  let config = {};

  try {
    config = require(`${appRoot}/config.json`);
    logger.info('Using custom config.');
  } catch (error) {
    logger.info('Not using custom config.');
  }

  config = defaultsDeep(require('../../config/immutable.json'), config);
  config = defaultsDeep(config, require('../../config/defaults.json'));
  config.nothing = function nothing () { return undefined; };

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
        logger.error({minPlayers: minPlayers(mode), maxPlayers: maxPlayers(mode), mode}, 'The minPlayers value is greater than the maxPlayers for mode.');
      }

      return originalFunction(mode);
    };
  }

  const anyDebugTrue = () =>  Object.keys(config.debug).filter((k) => config.debug[k]).length > 0

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