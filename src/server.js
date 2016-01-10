'use strict';

var frameworkInfo = require('./src/util/get-framework-info');

var logger = require('./src/logging/server/logger').logger;
var each = require('lodash').each;

var config = require('./src/util/config').get();
logger.logLevel = config.logging.logLevel;

var plugins = require('./src/plugins/plug-n-play').configure(
  logger,
  require('./src/conf/array-plugins'),
  require('./src/conf/default-mode-plugins'),
  config.logging.silencedPlugins
);

plugins.load({ type: 'Config', func: function Config () { return config; }});

var foldersToLoad = [
  'metrics',
  'core',
  'middleware',
  'routes',
  'input',
  'events',
  'state',
  'validators',
  'debug',
];

each(foldersToLoad, function loadFolder (folder) {
  plugins.loadFrameworkPath(__dirname + '/src/' + folder + '/shared');
  plugins.loadFrameworkPath(__dirname + '/src/' + folder + '/server');
});

function runGameAtPath (path) {
  logger.info('ensemblejs@' + frameworkInfo.version + ' started.');

  plugins.loadPath(path + '/js/logic');
  plugins.loadPath(path + '/js/state');
  plugins.loadPath(path + '/js/events');
  plugins.loadPath(path + '/js/maps');

  function publishStartServerEvent (exists) {
    var game = {
      modes: exists ? require(path + '/js/modes.json') : ['default'],
      id: config.game.id,
      name: config.game.name
    };

    plugins.get('On').serverStart(path, game);
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