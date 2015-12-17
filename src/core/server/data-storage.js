'use strict';

var each = require('lodash').each;
var remove = require('lodash').remove;
var contains = require('lodash').contains;

var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);
var config = require('../../util/config').get();

module.exports = {
  type: 'DbBridge',
  deps: ['DefinePlugin', 'RawStateAccess', 'On', 'GamesDataModel'],
  func: function MongoDbBridge (define, rawState, on, games) {
    var queue = [];

    function OpenDbConnection () {
      return function connectToMongo () {
        mongo.connect(config.mongo.endpoint, function () {
          logger.info('Connected to MongoDB');
          on().databaseReady();
        });
      };
    }

    function CloseDbConnection () {
      return function closeConnectionToMongo () {
        logger.info('Closing connection to MongoDB');
        flushPendingSaves(mongo.disconnect);
      };
    }

    function saveOrQueue (data) {
      if (!mongo.isConnected()) {
        queue.push(data);
        logger.info('No connection to MongoDB. Game not saved. Save queued until connection established.', {id: data.ensemble.gameId});
        return;
      } else {
        games().save(data);
      }
    }


    function SaveGameState() {
      if (!contains(['persistent', 'ephemeral'], config.ensemble.autoSaveBehaviour)) {
        return config.nothing;
      }

      logger.info('Enabled: "continual" save.');

      return function saveEveryFrame (state) {
        saveOrQueue(rawState().for(state.get('ensemble.gameId')));
      };
    }

    function InsertInitialCopyOfGame () {
      return function store (game) {
        saveOrQueue(rawState().for(game.id));
      };
    }

    function flushPendingSaves (callback) {
      logger.info('Flushing Pending Saves');

      var toFlush = remove(queue, function() { return true; });
      each(toFlush, function (save) {
        saveOrQueue(save, callback);
      });
    }

    function OnDatabaseReady () {
      return flushPendingSaves;
    }

    define()('OnServerStart', OpenDbConnection);
    define()('OnServerStop', CloseDbConnection);
    define()('OnGameReady', InsertInitialCopyOfGame);
    define()('AfterPhysicsFrame', SaveGameState);
    define()('OnDatabaseReady', OnDatabaseReady);
  }
};