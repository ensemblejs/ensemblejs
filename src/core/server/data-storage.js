'use strict';

var MongoClient = require('mongodb').MongoClient;
var each = require('lodash').each;
var remove = require('lodash').remove;

module.exports = {
  type: 'MongoDbBridge',
  deps: ['DefinePlugin', 'Config', 'Logger', 'RawStateAccess'],
  func: function MongoDbBridge (define, config, logger, rawState) {
    var db;
    var queue = [];

    function flushPendingSaves () {
      logger().info('Flushing Pending Saves');
      var toFlush = remove(queue, function() { return true; });
      each(toFlush, function (data) {
        storeTheFucker(data);
      });
    }

    function OpenDbConnection () {
      return function connectToMongo () {
        MongoClient.connect(config().mongo.endpoint, function(err, conn) {
          if (err) {
            logger().error('Unable to connect to MongoDb.', err);
            return;
          }

          logger().info('Connected to MongoDB');
          db = conn;

          flushPendingSaves();
        });
      };
    }

    function CloseDbConnection () {
      return function closeConnectionToMongo () {
        if (!db) {
          return;
        }

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
        logger().warn('No connection to MongoDB. Game not saved. Save queued until connection established.');
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

    define()('OnServerStart', OpenDbConnection);
    define()('OnServerStop', CloseDbConnection);
    define()('OnGameReady', InsertInitialCopyOfGame);
    define()('AfterPhysicsFrame', SaveGameState);

    return {
      saveGame: saveGame
    };
  }
};