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
  logger.info(`Checking for existing of database "${database}"`);
  return connection.database(database).existsAsync();
}

export function isLocal () {
  return config.get().database.host === 'localhost';
}

export function create (database) {
  logger.info({database: database}, 'Creating database.');

  return connection.database(database)
    .createAsync()
    .then(() => {
      logger.info({database: database}, 'Done. Database created.');
    })
    .catch(err => {
      logger.error({err: err, database: database}, 'Could not create database.');
    });
}

function notFound (err) {
  return err.error === 'not_found';
}

function conflict (err) {
  return err.error === 'conflict';
}

export function destroy (database) {
  logger.info({database: database}, 'Destroying database.');

  return connection.database(database)
    .destroyAsync()
    .then(() => {
      logger.info({database: database}, 'Done. Database destroyed.');
    })
    .catch(notFound, () => undefined)
    .catch(err => {
      logger.error({err: err, database: database}, 'Could not destroy database.');
    });
}

export function createView (database, view) {
  return connection.database(database)
    .saveAsync(`_design/${database}`, view)
    .catch(err => {
      logger.error({err: err, database: database, view: view}, 'Could not create view.');
    });
}

export function get (database, id) {
  return connection
    .database(database)
    .getAsync(id)
    .catch(err => logger.info({err: err, database: database, id: id}, 'Could not get document.'));
}

export function remove (database, id) {
  return connection.database(database)
    .getAsync(id)
    .then(r => connection.database(database).removeAsync(id, r._rev));
}

export function store (database, data) {
  return connection.database(database)
    .saveAsync(data.id || uuid.v4(), data._rev, data)
    .then(res => {
      data._rev = res.rev;
      return res;
    })
    .catch(conflict, err => {
      return get(database, data.id).then(record => {
        logger.error({err: err, database: database, data: data, latest: record}, 'Could not store document. Trying again with latest rev');
        data._rev = record._rev;
        store(database, data);
      });
    })
    .catch(err => logger.error({err: err, database: database, data: data}, 'Could not store document.'));
}

export function view (database, view, keys) {
  return connection
    .database(database)
    .viewAsync(`${database}/${view}`, keys)
    .catch(err => logger.info({err: err, database: database, view: view, keys: keys}, 'Could not get view.'));
}