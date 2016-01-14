'use strict';

var MongoClient = require('mongodb').MongoClient;
var Bluebird = require('bluebird');
var logger = require('../logging/server/logger').logger;

import config from './config';

var db;

function connect (endpoint = config.get().mongo.endpoint) {
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
    logger.error(err, 'Unable to connect to MongoDB.');
  });
}

function disconnect () {
  if (!db) {
    return;
  }

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
        if (data._id) {
          resolve(data._id);
        } else {
          resolve(res.result.upserted[0]._id);
        }
      }
    });
  })
  .then(function (id) {
    logger.debug('Saved.', { _id: id, collection: collection });
    return id;
  })
  .catch(function (err) {
    logger.error({err: err, collection: collection, data: data}, 'Unable to save.');
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
        things.push(adapter ? adapter(data) : data);
      } else {
        resolve(things);
      }
    });
  }).catch(function (err) {
    logger.error({err: err, collection: collection}, 'Unable to get all.');
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
          things.push(adapter ? adapter(data) : data);
        } else {
          resolve(things);
        }
      }
    });
  }).catch(function (err) {
    logger.error({err: err, collection: collection}, 'Unable to get by filter.');
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
    logger.error({err: err, collection: collection}, 'Unable to get one by filter.');
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
    logger.error({err: err, collection: collection, id: id}, 'Unable to get by id.');
  });
}

function removeAll (collection) {
  return new Bluebird (function (resolve, reject) {
    db.collection(collection).remove({}, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  }).catch(function (err) {
    logger.error({err: err, collection: collection}, 'Unable to remove all.');
  });
}

module.exports = {
  connect: connect,
  disconnect: disconnect,
  isConnected: isConnected,
  store: store,
  getAll: getAll,
  getById: getById,
  getOneByFilter: getOneByFilter,
  getAllByFilter: getAllByFilter,
  removeAll: removeAll
};