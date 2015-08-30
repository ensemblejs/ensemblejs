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

function removeTimers () {
  plugins.get('Profiler').removeTimersNotConfigured();
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

module.exports = {
  load: logging.logger.deprecate('load', 'Plugins are loaded automatically.'),
  set: plugins.set,
  setLogLevel: logging.setLogLevel,
  loadWindow: function loadWindow (window) {
    plugins.set('Window', window);
  },
  run: function run () {
    console.log('ensemblejs-client@' + packageInfo.version + ' started.');

    request(plugins.get('ServerUrl') + '/config').spread(getConfig)
      .then(setLogLevel)
      .then(loadModules)
      .then(removeTimers)
      .then(runTheClient)
      .error(logErrors);
  },
  loadClientFolder: function loadClientFolder (folder) {
    loadFolder(folder, 'Game');
  },
  loadDefaults: function loadDefaults () {
    plugins.set('ServerUrl', plugins.get('Window').location.origin);

    loadFolder(require('./src/metrics/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/core/shared/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/core/client/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/state/shared/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/state/client/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/input/shared/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/input/client/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/ui/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/views/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/loops/shared/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/loops/client/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/socket/shared/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/socket/client/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/jobs/shared/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/jobs/client/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/events/shared/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/events/client/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/debug/shared/**/*.js', {mode: 'hash'} ));
    loadFolder(require('./src/debug/client/**/*.js', {mode: 'hash'} ));
  }
};