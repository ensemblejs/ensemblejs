'use strict';

var once = require('lodash').once;
var MongoClient = require('mongodb').MongoClient;
var Bluebird = require('bluebird');

var db;
var logger;

function connect (endpoint, callback) {
  if (callback) {
    MongoClient.connect(endpoint, function(err, conn) {
      if (err) {
        logger.error('Unable to connect to MongoDB.', err);
        return;
      }

      db = conn;
      callback();
    });
  } else {
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

function store (collection, data, callback) {
  var filter = { _id: data._id };
  var opts = { upsert: true };

  if (callback) {
    db.collection(collection).replaceOne(filter, data, opts, function (err, res) {
      if (err) {
        logger.error('Unable to save to ' + collection + '.', err);
        return;
      }

      logger.debug('Saved.', { _id: res._id, collection: collection });

      if (callback) {
        callback(res.result.upserted[0]._id);
      }
    });
  } else {
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
}

function getAll(collection, adapter, callback) {
  var things = [];

  if (callback) {
    db.collection(collection).find().each(function(err, data) {
      if (err) {
        logger.error('Unable to get all ' + collection + '.', err);
        return;
      }

      if (data) {
        if (adapter) {
          things.push(adapter(data));
        } else {
          things.push(data);
        }
      } else {
        callback(things);
      }
    });
  } else {
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
}

function getAllByFilter (collection, filter, adapter, callback) {
  var things = [];

  if (callback) {
    db.collection(collection).find(filter).each(function(err, data) {
      if (err) {
        logger.error('Unable to get from ' + collection + '.', err);
      } else {
        if (data) {
          if (adapter) {
            things.push(adapter(data));
          } else {
            things.push(data);
          }
        } else {
          callback(things);
        }
      }

    });
  } else {
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
}

function getOneByFilter (collection, filter, callback) {
  if (!callback) {
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

  db.collection(collection).find(filter).limit(1).next(function(err, data) {
    if (err) {
      logger.error('Unable to get from ' + collection + '.', err);
      return;
    }

    callback(data);
  });
}

function getById (collection, id, callback) {
  if (!callback) {
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
    getById: getById,
    getOneByFilter: getOneByFilter,
    getAllByFilter: getAllByFilter
  };
}

module.exports = {
  setup: once(setup)
};