'use strict';

var MongoClient = require('mongodb').MongoClient;
var each = require('lodash').each;
var remove = require('lodash').remove;
var gameSummaryFromGameState = require('../../util/adapter').gameSummaryFromGameState;

module.exports = {
  type: 'DbBridge',
  deps: ['DefinePlugin', 'Config', 'Logger', 'RawStateAccess', 'On'],
  func: function MongoDbBridge (define, config, logger, rawState, on) {
    var db;
    var queue = [];

    function OpenDbConnection () {
      return function connectToMongo () {
        MongoClient.connect(config().mongo.endpoint, function(err, conn) {
          if (err) {
            logger().error('Unable to connect to MongoDb.', err);
            return;
          }

          logger().info('Connected to MongoDB');
          db = conn;

          on().databaseReady();
        });
      };
    }

    function CloseDbConnection () {
      return function closeConnectionToMongo () {
        if (!db) {
          return;
        }

        flushPendingSaves();
        logger().info('Closing connection to MongoDB');
        db.close();
      };
    }

    function SaveGameState() {
      if (config().ensemble.saveStyle !== 'continual') {
        return config().nothing;
      }

      logger().info('Enabled: "continual" save.');

      return function saveEveryFrame (state) {
        saveGame(state.get('ensemble.gameId'));
      };
    }

    function storeTheFucker (data) {
      if (!db) {
        queue.push(data);
        logger().info('No connection to MongoDB. Game not saved. Save queued until connection established.', {id: data._id});
        return;
      }

      var filter = { _id: data._id };
      var opts = { upsert: true };

      db.collection('games').replaceOne(filter, data, opts, function (err) {
        if (err) {
          logger().error('Unable to save game.', err);
          return;
        }

        logger().debug('Game saved', { gameId: data.ensemble.gameId });
      });
    }

    function insertData (data) {
      if (!data) {
        return;
      }

      data._id = data._id || data.ensemble.gameId;

      storeTheFucker(data);
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
      logger().info('Flushing Pending Saves');

      var toFlush = remove(queue, function() { return true; });
      each(toFlush, function (data) {
        storeTheFucker(data);
      });
    }

    function OnDatabaseReady () {
      return flushPendingSaves;
    }

    function getGames (callback) {
      var games = [];

      db.collection('games').find().each(function(err, data) {
        if (err) {
          logger().error('Unable to get game.', err);
          return;
        }

        if (data) {
          games.push(gameSummaryFromGameState(data));
        } else {
          callback(games);
        }
      });
    }

    function getGame (gameId, callback) {
      db.collection('games').find({_id: gameId}).limit(1).next(function(err, data) {
        if (err) {
          logger().error('Unable to get game.', err);
          return;
        }

        callback(data);
      });
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