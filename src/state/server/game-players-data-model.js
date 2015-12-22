'use strict';

var config = require('../../util/config').get();
var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);

module.exports = {
  type: 'GamePlayersDataModel',
  deps: ['UUID', 'Time', 'GamesDataModel'],
  func: function (uuid, time, saves) {
    var collection = 'save_game_players';

    function getPlayers (saveId, callback) {
      var filter = { saveId: saveId };

      mongo.getAllByFilter(collection, filter, undefined, callback);
    }

    function isPlayerInSave (saveId, playerId, callback) {
      var filter = { saveId: saveId, playerId: playerId };

      mongo.getOneByFilter(collection, filter, function (record) {
        callback(record !== null);
      });
    }

    function addPlayer (gameId, saveId, playerId, callback) {
      var record = {
        _id: uuid().gen(),
        saveId: saveId,
        gameId: gameId,
        playerId: playerId,
        updated: time().present()
      };

      mongo.store(collection, record, callback);
    }

    function getSavesForGameAndPlayer (gameId, playerId, callback) {
      var filter = { gameId: gameId, playerId: playerId };

      mongo.getAllByFilter(collection, filter, undefined, callback);
    }

    function getSavesForPlayer (playerId, callback) {
      var filter = { playerId: playerId };

      mongo.getAllByFilter(collection, filter, undefined, callback);
    }

    function doesSaveHaveSpaceForPlayer (saveId, callback) {
      saves().get(saveId, function (save) {
        getPlayers(saveId, function (players) {
          callback(players.length < config.maxPlayers(save.ensemble.mode));
        });
      });
    }

    function canPlayerJoinSave (saveId, playerId, callback) {
      saves().get(saveId, function (save) {
        if (save.ensemble.secret !== 'public') {
          callback(false);
          return;
        }

        doesSaveHaveSpaceForPlayer(saveId, callback);
      });
    }

    return {
      getPlayers: getPlayers,
      isPlayerInSave: isPlayerInSave,
      addPlayer: addPlayer,
      getSavesForPlayer: getSavesForPlayer,
      getSavesForGameAndPlayer: getSavesForGameAndPlayer,
      canPlayerJoinSave: canPlayerJoinSave,
      doesSaveHaveSpaceForPlayer: doesSaveHaveSpaceForPlayer
    };
  }
};