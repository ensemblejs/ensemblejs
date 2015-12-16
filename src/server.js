'use strict';

var appRoot = require('app-root-path');
var packageInfo = require(appRoot + '/package.json');
var logger = require('./logging/server/logger').logger;
var each = require('lodash').each;

var config = require('./util/config').get(logger);
logger.logLevel = config.logging.logLevel;

var plugins = require('./plugins/plug-n-play').configure(
  logger,
  require('./conf/array-plugins'),
  require('./conf/default-mode-plugins'),
  config.logging.silencedPlugins
);

plugins.load({ type: 'Config', func: function Config () { return config; }});

var foldersToLoad = [
  'metrics',
  'core',
  'input',
  'events',
  'state',
  'validators',
  'debug'
];

each(foldersToLoad, function loadFolder (folder) {
  plugins.loadFrameworkPath(__dirname + '/' + folder + '/shared');
  plugins.loadFrameworkPath(__dirname + '/' + folder + '/server');
});

function runGameAtPath (path) {
  logger.info('ensemblejs@' + packageInfo.version + ' started.');

  plugins.loadPath(path + '/js/logic');
  plugins.loadPath(path + '/js/state');
  plugins.loadPath(path + '/js/events');
  plugins.loadPath(path + '/js/maps');

  function publishStartServerEvent (exists) {
    var project = {
      modes: exists ? require(path + '/js/modes.json') : ['game'],
      name: packageInfo.name
    };

    plugins.get('On').serverStart(path, project);
  }

  require('fs').exists(path + '/js/modes.json', publishStartServerEvent);
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

module.exports = {
  runGameAtPath: runGameAtPath
};