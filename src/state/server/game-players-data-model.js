'use strict';

var config = require('../../util/config').get();
var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);

module.exports = {
  type: 'GamePlayersDataModel',
  deps: ['UUID', 'Time', 'GamesDataModel'],
  func: function (uuid, time, games) {
    var collection = 'game_players';

    function getPlayers (gameId, callback) {
      var filter = { gameId: gameId };

      mongo.getAllByFilter(collection, filter, undefined, callback);
    }

    function isPlayerInGame (gameId, playerId, callback) {
      var filter = { gameId: gameId, playerId: playerId };

      mongo.getOneByFilter(collection, filter, function (record) {
        callback(record !== null);
      });
    }

    function addPlayer (gameId, playerId, callback) {
      var record = {
        _id: uuid().gen(),
        gameId: gameId,
        playerId: playerId,
        updated: time().present()
      };

      mongo.store(collection, record, callback);
    }

    function getGamesForPlayer (playerId, callback) {
      var filter = { playerId: playerId };

      mongo.getAllByFilter(collection, filter, undefined, callback);
    }

    function canPlayerJoinGame (gameId, playerId, callback) {
      games().get(gameId, function (game) {
        getPlayers(gameId, function (players) {
          callback(players.length < config.maxPlayers(game.ensemble.mode));
        });
      });
    }

    return {
      getPlayers: getPlayers,
      isPlayerInGame: isPlayerInGame,
      addPlayer: addPlayer,
      getGamesForPlayer: getGamesForPlayer,
      canPlayerJoinGame: canPlayerJoinGame
    };
  }
};