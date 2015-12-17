'use strict';

var each = require('lodash').each;
var remove = require('lodash').remove;
var contains = require('lodash').contains;
var gameSummaryFromGameState = require('../../util/adapter').gameSummaryFromGameState;

var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);
var config = require('../../util/config').get();

module.exports = {
  type: 'DbBridge',
  deps: ['DefinePlugin', 'RawStateAccess', 'On', 'Time', 'UUID'],
  func: function MongoDbBridge (define, rawState, on, time, uuid) {
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

    function SaveGameState() {
      if (!contains(['persistent', 'ephemeral'], config.ensemble.autoSaveBehaviour)) {
        return config.nothing;
      }

      logger.info('Enabled: "continual" save.');

      return function saveEveryFrame (state) {
        saveGame(state.get('ensemble.gameId'));
      };
    }

    function insertData (data, callback) {
      if (!data) {
        return;
      }

      data._id = data._id || data.ensemble.gameId;
      data.updated = time().present();

      if (!mongo.isConnected()) {
        queue.push(data);
        logger.info('No connection to MongoDB. Game not saved. Save queued until connection established.', {id: data._id});
        return;
      }

      mongo.store('games', data, callback);
    }

    function saveGame (gameId) {
      insertData(rawState().for(gameId));
    }

    function InsertInitialCopyOfGame () {
      return function store (game) {
        saveGame(game.id);
      };
    }

    function flushPendingSaves (callback) {
      logger.info('Flushing Pending Saves');

      var toFlush = remove(queue, function() { return true; });
      each(toFlush, function (save) {
        insertData(save, callback);
      });
    }

    function OnDatabaseReady () {
      return flushPendingSaves;
    }

    function getGames (callback) {
      mongo.getAll('games', gameSummaryFromGameState, callback);
    }

    function getGame (gameId, callback) {
      mongo.getById('games', gameId, callback);
    }

    function getPlayer (player, callback) {
      mongo.getOneByFilter('players', player, callback);
    }

    function savePlayer (player, callback) {
      player.updated = time().present();

      mongo.store('players', player, callback);
    }


    var GamePlayers = {
      collection: 'game_players',
      getPlayers: function (gameId, callback) {
        var filter = { gameId: gameId };

        mongo.getAllByFilter(GamePlayers.collection, filter, undefined, callback);
      },
      playerInGame: function (gameId, playerId, callback) {
        var filter = { gameId: gameId, playerId: playerId };

        mongo.getOneByFilter(GamePlayers.collection, filter, function (record) {
          callback(record !== null);
        });
      },
      addPlayer: function (gameId, playerId, callback) {
        var record = {
          _id: uuid().gen(),
          gameId: gameId,
          playerId: playerId,
          updated: time().present()
        };

        mongo.store(GamePlayers.collection, record, callback);
      },
      getGamesForPlayer: function (playerId, callback) {
        var filter = { playerId: playerId };

        mongo.getAllByFilter(GamePlayers.collection, filter, undefined, callback);
      }
    };

    function doesPlayerBelongToGame (gameId, playerId, callback) {
      GamePlayers.playerInGame(gameId, playerId, callback);
    }

    function canPlayerJoin (gameId, playerId, callback) {
      getGame(gameId, function (game) {
        GamePlayers.getPlayers(gameId, function (players) {
          callback(players.length < config.maxPlayers(game.ensemble.mode));
        });
      });
    }

    function addPlayerToGame (gameId, playerId, callback) {
      GamePlayers.addPlayer(gameId, playerId, callback);
    }

    define()('OnServerStart', OpenDbConnection);
    define()('OnServerStop', CloseDbConnection);
    define()('OnGameReady', InsertInitialCopyOfGame);
    define()('AfterPhysicsFrame', SaveGameState);
    define()('OnDatabaseReady', OnDatabaseReady);

    //TODO: This should really be split into themed controllers
    return {
      getGames: getGames,
      getGame: getGame,
      saveGame: saveGame,
      getPlayer: getPlayer,
      savePlayer: savePlayer,
      doesPlayerBelongToGame: doesPlayerBelongToGame,
      canPlayerJoin: canPlayerJoin,
      addPlayerToGame: addPlayerToGame,
      getGamesForPlayer: GamePlayers.getGamesForPlayer
    };
  }
};