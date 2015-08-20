'use strict';

var appRoot = require('app-root-path');
var defaultsDeep = require('lodash').defaultsDeep;
var packageInfo = require(appRoot + '/package.json');
var logger = require('./logging/server/logger.js').logger;

function getConfig() {
  var config = {};

  try {
    config = require(appRoot + '/config.json');
    logger.info('Using custom config.');
  } catch (error) {
    logger.info('Not using custom config.');
  }

  config = defaultsDeep(config, require('../config/defaults.json'));
  logger.info(config, 'Initial Configuration');

  return config;
}

var config = getConfig();
logger.logLevel = config.logging.logLevel;

//TODO: pull this stuff from the config files
var plugins = require('./plugins/plug-n-play').configure(
  logger,
  require('./conf/array-plugins'),
  require('./conf/default-mode-plugins'),
  config.logging.silencedPlugins
);

plugins.load({ type: 'Config', func: function Config () { return config; }});

//TODO: solve the ordering problem
plugins.load(require('./metrics/profiler'));

plugins.load(require('./jobs/job_manager.js'));
plugins.load(require('./socket/server.js'));
plugins.loadPath(__dirname + '/loops/shared');
plugins.loadPath(__dirname + '/loops/server');
plugins.loadPath(__dirname + '/core/shared');
plugins.loadPath(__dirname + '/core/server');
plugins.loadPath(__dirname + '/input/shared');
plugins.loadPath(__dirname + '/input/server');
plugins.loadPath(__dirname + '/events/shared');
plugins.loadPath(__dirname + '/events/server');
plugins.loadPath(__dirname + '/state/shared');
plugins.loadPath(__dirname + '/state/server');
plugins.loadPath(__dirname + '/validators');
plugins.loadPath(__dirname + '/debug/shared');
plugins.loadPath(__dirname + '/debug/server');

function run (pathToGame, modes) {
  plugins.get('HttpServer').start(pathToGame, modes);
  plugins.get('RunValidations').execute();
  plugins.get('ServerSideEngine').run();
}

function runGameAtPath (path) {
  logger.info('ensemblejs@' + packageInfo.version + ' started.');

  plugins.loadPath(path + '/js/logic');
  plugins.loadPath(path + '/js/state');
  plugins.loadPath(path + '/js/events');
  plugins.loadPath(path + '/js/maps');

  require('fs').exists(path + '/js/modes.json', function (exists) {
    if (exists) {
      run(path, require(path + '/js/modes.json'));
    } else {
      run(path, []);
    }
  });
}

module.exports = {
  runGameAtPath: runGameAtPath
};