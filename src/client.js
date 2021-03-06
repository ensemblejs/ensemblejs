'use strict';

const logging = require('./logging/client/logger');
const Bluebird = require('bluebird');
const request = Bluebird.promisifyAll(require('request'));
const packageInfo = require('../package.json');
import {each} from 'lodash/collection';

const folders = [];
const gameFolders = [];

const plugins = require('./plugins/plug-n-play').configure(logging.logger, require('../config/array-plugins'), require('../config/default-mode-plugins'), require('../config/client-silenced-plugins'));

plugins.set('Window', window);
plugins.set('Modernizr', Modernizr);
plugins.set('DeviceMode', deviceMode || { name: 'observer' });
plugins.set('ServerUrl', plugins.get('Window').location.origin);

function getConfig(response) {
  plugins.load({
    type: 'Config',
    func: function Config() {
      const config = JSON.parse(response.body);
      config.nothing = () => undefined;

      return config;
    }
  });
}

function setLogLevel() {
  logging.setLogLevel(plugins.get('Config').logging.logLevel);
}

function loadFolder(folder, namespace = 'ensemblejs') {
  folders.push({ items: folder, namespace });
}

function loadGameFolder(folder, namespace = 'Game') {
  gameFolders.push({ items: folder, namespace });
}

function runTheClient() {
  plugins.get('SocketClient').connect();
}

function loadModules() {
  each(folders, function loadEachFolder(folder) {
    each(folder.items, (item) => plugins.load(item, folder.namespace));
  });

  each(gameFolders, function loadEachFolder(folder) {
    each(folder.items, (item) => plugins.load(item, folder.namespace));
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
  logging.logger.info(`ensemblejs@${packageInfo.version} client started.`);

  request.getAsync(`${plugins.get('ServerUrl')}/config`)
    .then(getConfig)
    .then(setLogLevel)
    .then(loadDefaults)
    .then(loadModules)
    .then(runTheClient)
    .error(logging.logger.error);
}

export function loadClientFolder(folder) {
  loadGameFolder(folder);
}

export const set = plugins.set;

export default {
  loadClientFolder,
  run,
  set: plugins.set
};