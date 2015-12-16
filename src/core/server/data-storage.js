'use strict';

var each = require('lodash').each;
var remove = require('lodash').remove;
var gameSummaryFromGameState = require('../../util/adapter').gameSummaryFromGameState;

var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);
var globalConfig = require('../../util/config').get();

module.exports = {
  type: 'DbBridge',
  deps: ['DefinePlugin', 'RawStateAccess', 'On', 'Time'],
  func: function MongoDbBridge (define, rawState, on, time) {
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
      data.timestamp = time().present();

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