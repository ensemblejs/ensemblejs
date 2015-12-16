'use strict';

var MongoClient = require('mongodb').MongoClient;
var each = require('lodash').each;
var remove = require('lodash').remove;
var gameSummaryFromGameState = require('../../util/adapter').gameSummaryFromGameState;

var logger = require('../../logging/server/logger').logger;
var globalConfig = require('../../util/config').get();

var db;
var mongo = {
  connect: function connect (endpoint, callback) {
    MongoClient.connect(endpoint, function(err, conn) {
      if (err) {
        logger.error('Unable to connect to MongoDb.', err);
        return;
      }

      db = conn;
      callback();
    });
  },
  disconnect: function disconnect (callback) {
    if (!db) {
      return;
    }

    callback();
    db.close();
  },
  isConnected: function isConnected () {
    return db !== undefined;
  },
  store: function store (collection, data) {
    var filter = { _id: data._id };
    var opts = { upsert: true };

    db.collection(collection).replaceOne(filter, data, opts, function (err) {
      if (err) {
        logger.error('Unable to save ' + collection + '.', err);
        return;
      }

      logger.debug('Game saved', { gameId: data.ensemble.gameId });
    });
  },
  getAll: function getAll(collection, adapter, callback) {
    var games = [];
    db.collection(collection).find().each(function(err, data) {
      if (err) {
        logger.error('Unable to get all ' + collection + '.', err);
        return;
      }

      if (data) {
        games.push(adapter(data));
      } else {
        callback(games);
      }
    });
  },
  getById: function getById (collection, id, callback) {
    db.collection(collection).find({_id: id}).limit(1).next(function(err, data) {
      if (err) {
        logger.error('Unable to get from ' + collection + '.', err);
        return;
      }

      callback(data);
    });
  }
};

module.exports = {
  type: 'DbBridge',
  deps: ['DefinePlugin', 'RawStateAccess', 'On'],
  func: function MongoDbBridge (define, rawState, on) {
    var queue = [];

    function OpenDbConnection () {
      return function connectToMongo () {
        mongo.connect(globalConfig.mongo.endpoint, function () {
          logger.info('Connected to MongoDB');
          on().databaseReady();
        });
      };
    }

    function CloseDbConnection () {
      return function closeConnectionToMongo () {
        logger.info('Closing connection to MongoDB');
        mongo.disconnect(flushPendingSaves);
      };
    }

    function SaveGameState() {
      if (globalConfig.ensemble.saveStyle !== 'continual') {
        return globalConfig.nothing;
      }

      logger.info('Enabled: "continual" save.');

      return function saveEveryFrame (state) {
        saveGame(state.get('ensemble.gameId'));
      };
    }

    function insertData (data) {
      if (!data) {
        return;
      }

      data._id = data._id || data.ensemble.gameId;

      if (!mongo.isConnected()) {
        queue.push(data);
        logger.info('No connection to MongoDB. Game not saved. Save queued until connection established.', {id: data._id});
        return;
      }

      mongo.store('games', data);
    }

    function saveGame (gameId) {
      insertData(rawState().for(gameId));
    }

    function InsertInitialCopyOfGame () {
      return function store (game) {
        saveGame(game.id);
      };
    }

    function flushPendingSaves () {
      logger.info('Flushing Pending Saves');

      var toFlush = remove(queue, function() { return true; });
      each(toFlush, insertData);
    }

    function OnDatabaseReady () {
      return flushPendingSaves;
    }

    function getGames (callback) {
      mongo.getAll('games', gameSummaryFromGameState, callback, logger);
    }

    function getGame (gameId, callback) {
      mongo.getById('games', gameId, callback, logger);
    }

    define()('OnServerStart', OpenDbConnection);
    define()('OnServerStop', CloseDbConnection);
    define()('OnGameReady', InsertInitialCopyOfGame);
    define()('AfterPhysicsFrame', SaveGameState);
    define()('OnDatabaseReady', OnDatabaseReady);

    return {
      getGames: getGames,
      getGame: getGame,
      saveGame: saveGame
    };
  }
};