'use strict';

//jshint browser:true

var logging = require('./logging/client/logger');
var Bluebird = require('bluebird');
var request = Bluebird.promisify(require('request'));
var packageInfo = require('../package.json');
import {each} from 'lodash/collection';

var folders = [];
var gameFolders = [];

var plugins = require('./plugins/plug-n-play').configure(logging.logger, require('../config/array-plugins'), require('../config/default-mode-plugins'), require('../config/client-silenced-plugins'));

plugins.set('Window', window);
plugins.set('Modernizr', Modernizr);
plugins.set('DeviceMode', deviceMode || 'observer');//jshint ignore:line
plugins.set('ServerUrl', plugins.get('Window').location.origin);

function getConfig(response, body) {
  plugins.load({
    type: 'Config',
    func: function Config() {
      var config = JSON.parse(body);
      config.nothing = function nothing() {};

      return config;
    }
  });
}

function setLogLevel() {
  logging.setLogLevel(plugins.get('Config').logging.logLevel);
}

function loadFolder(folder, namespace = 'ensemblejs') {
  folders.push({ items: folder, namespace: namespace });
}

function loadGameFolder(folder, namespace = 'Game') {
  gameFolders.push({ items: folder, namespace: namespace });
}

function runTheClient() {
  plugins.get('SocketClient').connect();
}

function loadModules() {
  each(folders, function loadEachFolder(folder) {
    each(folder.items, item => plugins.load(item, folder.namespace));
  });

  each(gameFolders, function loadEachFolder(folder) {
    each(folder.items, item => plugins.load(item, folder.namespace));
  });
}

function loadDefaults() {
  loadFolder(require('./metrics/shared/*.js', { mode: 'hash' }));
  loadFolder(require('./metrics/client/*.js', { mode: 'hash' }));

  loadFolder(require('./core/shared/**/*.js', { mode: 'hash' }));
  loadFolder(require('./core/client/**/*.js', { mode: 'hash' }));

  loadFolder(require('./input/shared/**/*.js', { mode: 'hash' }));
  loadFolder(require('./input/client/**/*.js', { mode: 'hash' }));

  loadFolder(require('./events/shared/**/*.js', { mode: 'hash' }));
  loadFolder(require('./events/client/**/*.js', { mode: 'hash' }));

  loadFolder(require('./state/shared/**/*.js', { mode: 'hash' }));
  loadFolder(require('./state/client/**/*.js', { mode: 'hash' }));

  loadFolder(require('./ui/**/*.js', { mode: 'hash' }));

  loadFolder(require('./validators/shared/**/*.js', { mode: 'hash' }));
  loadFolder(require('./validators/client/**/*.js', { mode: 'hash' }));

  loadFolder(require('./debug/shared/**/*.js', { mode: 'hash' }));
  loadFolder(require('./debug/client/**/*.js', { mode: 'hash' }));
}

export function run() {
  console.info('ensemblejs-client@' + packageInfo.version + ' started.');

  request(plugins.get('ServerUrl') + '/config')
    .spread(getConfig)
    .then(setLogLevel)
    .then(loadDefaults)
    .then(loadModules)
    .then(runTheClient)
    .error(logging.logger.error);
}

export function loadClientFolder(folder) {
  loadGameFolder(folder);
}

export let set = plugins.set;

export default {
  loadClientFolder: loadClientFolder,
  run: run,
  set: plugins.set
};