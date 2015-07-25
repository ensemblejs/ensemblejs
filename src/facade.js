'use strict';

var appRoot = require('app-root-path');
var packageInfo = require(appRoot + '/package.json');
var logger = require('./logging/logger.js').logger;
var defaults = require('lodash').defaults;
var defaultConfig = require('../config/defaults.json');

function getConfig() {
  var config = {};

  try {
    config = require(appRoot + '/config.json');
    logger.info('Using custom config.');
  } catch (error) {
    logger.info('Not using custom config.');
  }

  config = defaults(config, defaultConfig);
  logger.info(config, 'Initial Configuration');

  return config;
}

var config = getConfig();
logger.logLevel = config.logging.logLevel;

var plugins = require('plug-n-play').configure(
  logger,
  require('./conf/array-plugins'),
  require('./conf/default-mode-plugins'),
  config.logging.silencedPlugins
);

plugins.load({
  type: 'Config',
  func: function() {
    return config;
  }
});

plugins.load(require('./server.js'));
plugins.load(require('./jobs/job_manager.js'));
plugins.load(require('./socket.js'));
plugins.load(require('./engine.js'));
plugins.loadPath(__dirname + '/input');
plugins.loadPath(__dirname + '/events');
plugins.loadPath(__dirname + '/state');
plugins.loadPath(__dirname + '/validators');
plugins.loadPath(__dirname + '/debug');

function run (pathToGame, modes) {
  plugins.get('HttpServer').start(pathToGame, modes);
  plugins.get('RunValidations').execute();
  plugins.get('ServerSideEngine').run(120);
}

function runGameAtPath (path) {
  logger.info('ensemblejs@' + packageInfo.version + ' started.');

  plugins.loadPath(path + '/js/logic');
  plugins.loadPath(path + '/js/state');
  plugins.loadPath(path + '/js/events');
  plugins.loadPath(path + '/js/maps');

  if (require('fs').existsSync(path + '/js/modes.json')) {
    run(path, require(path + '/js/modes.json'));
  } else {
    run(path, []);
  }
}

module.exports = {
  runGameAtPath: runGameAtPath
};