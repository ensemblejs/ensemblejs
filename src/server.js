'use strict';

import { logger, setLogLevel } from './logging/server/logger';

const frameworkInfo = require('./util/get-framework-info');
const config = require('./util/config').get();

setLogLevel(config);

const plugins = require('./plugins/plug-n-play').configure(
  logger,
  require('../config/array-plugins'),
  require('../config/default-mode-plugins'),
  config.logging.silencedPlugins
);

plugins.load({type: 'Config', func: () => config});

const foldersToLoad = ['metrics', 'core', 'middleware', 'routes', 'input', 'events', 'state', 'validators', 'ui', 'debug'];

foldersToLoad.forEach(function loadFolder(folder) {
  plugins.loadFrameworkPath(`${__dirname}/${folder}/shared`);
  plugins.loadFrameworkPath(`${__dirname}/${folder}/server`);
});

function getDeviceModes (path) {
  const exists = require('fs').existsSync(`${path}/js/device-modes.json`);
  const defaultDeviceConfig = require('../config/device-mode-defaults');

  return !exists
    ?  [defaultDeviceConfig]
    : require(`${path}/js/device-modes.json`).map((deviceMode) => (
        { ...defaultDeviceConfig, ...deviceMode}
      ));
}

function runGameAtPath(path) {
  logger.info(`ensemblejs@${frameworkInfo().version} started.`);

  plugins.loadPath(`${path}/js/logic`);
  plugins.loadPath(`${path}/js/state`);
  plugins.loadPath(`${path}/js/events`);
  plugins.loadPath(`${path}/js/maps`);

  function publishStartServerEvent(exists) {
    const game = {
      modes: exists ? require(`${path}/js/modes.json`) : ['default'],
      deviceModes: getDeviceModes(path),
      id: config.game.id,
      name: config.game.name
    };

    config.game.path = path;
    config.game.modes = game.modes;

    plugins.get('On').serverStart(path, game);
  }

  require('fs').exists(`${path}/js/modes.json`, publishStartServerEvent);
}

function shutdownHandler() {
  logger.info('Shutdown request received. Shutting down.');

  plugins.get('On').serverStop();

  setTimeout(process.exit, 1000);
}

process.on('SIGINT', shutdownHandler);
process.on('SIGTERM', shutdownHandler);
process.on('SIGHUP', shutdownHandler);
process.on('uncaughtException', plugins.get('On').error);
process.on('unhandledRejection', plugins.get('On').error);

module.exports = { runGameAtPath };