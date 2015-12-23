'use strict';

var config = require('../../util/config').get();
var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);

function determineExistence (record) {
  return record !== null;
}

module.exports = {
  type: 'GamePlayersDataModel',
  deps: ['UUID', 'Time', 'GamesDataModel'],
  func: function (uuid, time, saves) {
    var collection = 'save_game_players';

    function getPlayers (saveId) {
      var filter = { saveId: saveId };

      return mongo.getAllByFilter(collection, filter, undefined);
    }

    function isPlayerInSave (saveId, playerId) {
      var filter = { saveId: saveId, playerId: playerId };

      return mongo.getOneByFilter(collection, filter)
          .then(determineExistence);
    }

    function addPlayer (gameId, saveId, playerId) {
      var record = {
        _id: uuid().gen(),
        saveId: saveId,
        gameId: gameId,
        playerId: playerId,
        updated: time().present()
      };

      return mongo.store(collection, record);
    }

    function getSavesForGameAndPlayer (gameId, playerId) {
      var filter = { gameId: gameId, playerId: playerId };

      return mongo.getAllByFilter(collection, filter, undefined);
    }

    function doesSaveHaveSpaceForPlayer (saveId) {
      saves().get(saveId)
        .then(function withSave (save) {
          return getPlayers(saveId)
            .then(function withPlayers (players) {
              return (players.length < config.maxPlayers(save.ensemble.mode));
            });
        });
    }

    function canPlayerJoinSave (saveId) {
      return saves().get(saveId)
        .then(function (save) {
          if (save.ensemble.secret !== 'public') {
            return false;
          }

          return doesSaveHaveSpaceForPlayer(saveId);
        });
    }

    return {
      getPlayers: getPlayers,
      isPlayerInSave: isPlayerInSave,
      addPlayer: addPlayer,
      getSavesForGameAndPlayer: getSavesForGameAndPlayer,
      canPlayerJoinSave: canPlayerJoinSave,
      doesSaveHaveSpaceForPlayer: doesSaveHaveSpaceForPlayer
    };
  }
};