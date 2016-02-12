'use strict';

var Bluebird = require('bluebird');
var cradle = Bluebird.promisifyAll(require('cradle'));
var logger = require('../logging/server/logger').logger;
import uuid from 'node-uuid';
import config from './config';

cradle.setup({
  host: config.get().database.host,
  port: config.get().database.port,
  cache: config.get().database.cache,
  raw: config.get().database.raw,
  forceSave: config.get().database.forceSave
});

var connection = new(cradle.Connection)();

export function exists (database) {
  return connection.database(database).existsAsync();
}

export function isLocal () {
  return config.get().database.host === 'localhost';
}

export function create (database) {
  return connection.database(database).createAsync().catch((err) => {
    logger.error(err, 'Could not create database.');
  });
}

export function destroy (database) {
  return connection.database(database).destroyAsync();
}

export function createView (database, view) {
  return connection.database(database).saveAsync(`_design/${database}`, view);
}

export function store (database, data) {
  return connection.database(database)
    .saveAsync(data.id || uuid.v4(), data)
    .catch(err => logger.error({err: err, database: database, data: data}, 'Could not store document.'));
}

export function view (database, view, keys) {
  return connection.database(database).viewAsync(`${database}/${view}`, keys);
}

export function get (database, id) {
  return connection.database(database).getAsync(id)
    .catch(err => logger.info({err: err, database: database, id: id}, 'Could not get document.'));
}