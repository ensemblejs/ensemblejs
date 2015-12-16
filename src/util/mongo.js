'use strict';

var MongoClient = require('mongodb').MongoClient;

var db;
var logger;

function connect (endpoint, callback) {
  MongoClient.connect(endpoint, function(err, conn) {
    if (err) {
      logger.error('Unable to connect to MongoDB.', err);
      return;
    }

    db = conn;
    callback();
  });
}

function disconnect (callback) {
  if (!db) {
    return;
  }

  callback();
  db.close();
}

function isConnected () {
  return db !== undefined;
}

function store (collection, data) {
  var filter = { _id: data._id };
  var opts = { upsert: true };

  db.collection(collection).replaceOne(filter, data, opts, function (err) {
    if (err) {
      logger.error('Unable to save to ' + collection + '.', err);
      return;
    }

    logger.debug('Game saved', { gameId: data.ensemble.gameId });
  });
}

function getAll(collection, adapter, callback) {
  var things = [];
  db.collection(collection).find().each(function(err, data) {
    if (err) {
      logger.error('Unable to get all ' + collection + '.', err);
      return;
    }

    if (data) {
      things.push(adapter(data));
    } else {
      callback(things);
    }
  });
}

function getById (collection, id, callback) {
  db.collection(collection).find({_id: id}).limit(1).next(function(err, data) {
    if (err) {
      logger.error('Unable to get from ' + collection + '.', err);
      return;
    }

    callback(data);
  });
}

function setup (log) {
  logger = log;

  return {
    connect: connect,
    disconnect: disconnect,
    isConnected: isConnected,
    store: store,
    getAll: getAll,
    getById: getById
  };
}

module.exports = {
  setup: setup
};