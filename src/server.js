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

plugins.loadPath(__dirname + '/metrics/shared');
plugins.loadPath(__dirname + '/metrics/server');
plugins.loadPath(__dirname + '/core/shared');
plugins.loadPath(__dirname + '/core/server');
plugins.loadPath(__dirname + '/socket/shared');
plugins.loadPath(__dirname + '/socket/server');
plugins.loadPath(__dirname + '/input/shared');
plugins.loadPath(__dirname + '/input/server');
plugins.loadPath(__dirname + '/events/shared');
plugins.loadPath(__dirname + '/events/server');
plugins.loadPath(__dirname + '/state/shared');
plugins.loadPath(__dirname + '/state/server');
plugins.loadPath(__dirname + '/validators/shared');
plugins.loadPath(__dirname + '/validators/server');
plugins.loadPath(__dirname + '/debug/shared');
plugins.loadPath(__dirname + '/debug/server');

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