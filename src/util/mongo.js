'use strict';

var once = require('lodash').once;
var MongoClient = require('mongodb').MongoClient;
var Bluebird = require('bluebird');

var db;
var logger;

function connect (endpoint) {
  return new Bluebird (function (resolve, reject) {
    MongoClient.connect(endpoint, function(err, conn) {
      if (err) {
        reject(err);
      } else {
        db = conn;
        resolve();
      }
    });
  })
  .catch(function (err) {
    logger.error('Unable to connect to MongoDB.', err);
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

  return new Bluebird (function (resolve, reject) {
    db.collection(collection).replaceOne(filter, data, opts, function (err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res.result.upserted[0]._id);
      }
    });
  })
  .then(function (id) {
    logger.debug('Saved.', { _id: id, collection: collection });
  })
  .catch(function (err) {
    logger.error('Unable to save to ' + collection + '.', err);
  });
}

function getAll(collection, adapter) {
  var things = [];

  return new Bluebird (function (resolve, reject) {
    db.collection(collection).find().each(function(err, data) {
      if (err) {
        reject(err);
        return;
      }

      if (data) {
        if (adapter) {
          things.push(adapter(data));
        } else {
          things.push(data);
        }
      } else {
        resolve(things);
      }
    });
  }).catch(function (err) {
    logger.error('Unable to get all ' + collection + '.', err);
  });
}

function getAllByFilter (collection, filter, adapter) {
  var things = [];

  return new Bluebird (function (resolve, reject) {
    db.collection(collection).find(filter).each(function(err, data) {
      if (err) {
        reject(err);
      } else {
        if (data) {
          if (adapter) {
            things.push(adapter(data));
          } else {
            things.push(data);
          }
        } else {
          resolve(things);
        }
      }
    });
  }).catch(function (err) {
    logger.error('Unable to get from ' + collection + '.', err);
  });
}

function getOneByFilter (collection, filter) {
  return new Bluebird (function (resolve, reject) {
    db.collection(collection).find(filter).limit(1).next(function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  }).catch(function (err) {
    logger.error('Unable to get from ' + collection + '.', err);
  });
}

function getById (collection, id) {
  return new Bluebird (function (resolve, reject) {
    db.collection(collection).find({_id: id}).limit(1).next(function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  }).catch(function (err) {
    logger.error('Unable to get from ' + collection + '.', err);
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
    getById: getById,
    getOneByFilter: getOneByFilter,
    getAllByFilter: getAllByFilter
  };
}

module.exports = {
  setup: once(setup)
};