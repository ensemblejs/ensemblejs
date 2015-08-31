'use strict';

var appRoot = require('app-root-path');
var packageInfo = require(appRoot + '/package.json');
var logger = require('./logging/server/logger').logger;

var config = require('./util/config')(logger);
logger.logLevel = config.logging.logLevel;

var plugins = require('./plugins/plug-n-play').configure(
  logger,
  require('./conf/array-plugins'),
  require('./conf/default-mode-plugins'),
  config.logging.silencedPlugins
);

plugins.load({ type: 'Config', func: function Config () { return config; }});

plugins.loadFrameworkPath(__dirname + '/metrics/shared');
plugins.loadFrameworkPath(__dirname + '/metrics/server');
plugins.loadFrameworkPath(__dirname + '/core/shared');
plugins.loadFrameworkPath(__dirname + '/core/server');
plugins.loadFrameworkPath(__dirname + '/socket/shared');
plugins.loadFrameworkPath(__dirname + '/socket/server');
plugins.loadFrameworkPath(__dirname + '/input/shared');
plugins.loadFrameworkPath(__dirname + '/input/server');
plugins.loadFrameworkPath(__dirname + '/events/shared');
plugins.loadFrameworkPath(__dirname + '/events/server');
plugins.loadFrameworkPath(__dirname + '/state/shared');
plugins.loadFrameworkPath(__dirname + '/state/server');
plugins.loadFrameworkPath(__dirname + '/validators/shared');
plugins.loadFrameworkPath(__dirname + '/validators/server');
plugins.loadFrameworkPath(__dirname + '/debug/shared');
plugins.loadFrameworkPath(__dirname + '/debug/server');

function runGameAtPath (path) {
  logger.info('ensemblejs@' + packageInfo.version + ' started.');

  plugins.loadPath(path + '/js/logic');
  plugins.loadPath(path + '/js/state');
  plugins.loadPath(path + '/js/events');
  plugins.loadPath(path + '/js/maps');

  function modesJsonExists (exists) {
    var modes = exists ? require(path + '/js/modes.json') : [];
    plugins.get('On').start(path, modes);
  }

  require('fs').exists(path + '/js/modes.json', modesJsonExists);
}

module.exports = {
  runGameAtPath: runGameAtPath
};