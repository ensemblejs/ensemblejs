'use strict';

var logging = require('./src/logging/client/logger');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var packageInfo = require('./package.json');
var each = require('lodash').each;

var folders = [];

var plugins = require('./src/plugins/plug-n-play').configure(
  logging.logger,
  require('./src/conf/array-plugins'),
  require('./src/conf/default-mode-plugins'),
  require('./src/conf/client-silenced-plugins')
);

plugins.set('Window', window);

function getConfig (response, body) {
  plugins.load({
    type: 'Config',
    func: function Config () {
      var config = JSON.parse(body);
      config.nothing = function nothing () {};

      return config;
    }
  });
}

function setLogLevel () {
  var config = plugins.get('Config');

  logging.setLogLevel(config.logging.logLevel);
}

function loadFolder (folder, namespace) {
  namespace = namespace || 'ensemblejs';

  folders.push({items: folder, namespace: namespace});
}

function logErrors (error) {
  logging.logger.error(error);
}

function runTheClient() {
  plugins.get('SocketClient').connect();
}

function loadModules() {
  each(folders, function loadEachFolder (folder) {
    each(folder.items, function loadEachItem (item) {
      plugins.load(item, folder.namespace);
    });
  });
}

function run () {
  console.log('ensemblejs-client@' + packageInfo.version + ' started.');

  request(plugins.get('ServerUrl') + '/config').spread(getConfig)
    .then(setLogLevel)
    .then(loadModules)
    .then(runTheClient)
    .error(logErrors);
}

function loadClientFolder (folder) {
  loadFolder(folder, 'Game');
}

function loadDefaults () {
  plugins.set('ServerUrl', plugins.get('Window').location.origin);

  loadFolder(require('./src/metrics/shared/*.js', {mode: 'hash'} ));
  loadFolder(require('./src/metrics/client/*.js', {mode: 'hash'} ));

  loadFolder(require('./src/core/shared/**/*.js', {mode: 'hash'} ));
  loadFolder(require('./src/core/client/**/*.js', {mode: 'hash'} ));

  loadFolder(require('./src/input/shared/**/*.js', {mode: 'hash'} ));
  loadFolder(require('./src/input/client/**/*.js', {mode: 'hash'} ));

  loadFolder(require('./src/events/shared/**/*.js', {mode: 'hash'} ));
  loadFolder(require('./src/events/client/**/*.js', {mode: 'hash'} ));

  loadFolder(require('./src/state/shared/**/*.js', {mode: 'hash'} ));
  loadFolder(require('./src/state/client/**/*.js', {mode: 'hash'} ));

  loadFolder(require('./src/ui/**/*.js', {mode: 'hash'} ));

  loadFolder(require('./src/validators/shared/**/*.js', {mode: 'hash'} ));
  loadFolder(require('./src/validators/client/**/*.js', {mode: 'hash'} ));

  loadFolder(require('./src/debug/shared/**/*.js', {mode: 'hash'} ));
  loadFolder(require('./src/debug/client/**/*.js', {mode: 'hash'} ));
}

module.exports = {
  load: logging.logger.deprecate('load', 'Plugins are loaded automatically.'),
  set: plugins.set,
  setLogLevel: logging.setLogLevel,
  run: run,
  loadClientFolder: loadClientFolder,
  loadDefaults: loadDefaults
};