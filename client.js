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
      return JSON.parse(body);
    }
  });
}

function setLogLevel () {
  var config = plugins.get('Config');

  logging.setLogLevel(config.logging.logLevel);
}

function loadFolderOfModules (folder, namespace) {
  namespace = namespace || 'ensemblejs';

  folders.push({items: folder, namespace: namespace});
}

function loadExtras () {
    var config = plugins.get('Config');

    if (config.debug.inputOverlay) {
      console.info('Enable input debug overlay');
      loadFolderOfModules(require('./src/debug/shared/**/*.js', {mode: 'hash'} ));
      loadFolderOfModules(require('./src/debug/client/**/*.js', {mode: 'hash'} ));
    }
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
      .then(loadExtras)
      .then(removeTimers)
      .then(runTheClient)
      .error(logErrors);
  },
  loadClientFolder: function loadClientFolder (folder) {
    loadFolderOfModules(folder, 'Game');
  },
  loadDefaults: function loadDefaults () {
    plugins.set('ServerUrl', plugins.get('Window').location.origin);

    loadFolderOfModules(require('./src/metrics/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/core/shared/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/state/shared/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/input/shared/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/core/client/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/state/client/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/input/client/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/ui/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/views/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/loops/client/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/socket/client/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/events/shared/**/*.js', {mode: 'hash'} ));
    loadFolderOfModules(require('./src/events/client/**/*.js', {mode: 'hash'} ));
  }
};