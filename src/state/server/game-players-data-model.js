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

    function getPlayers (saveId, callback) {
      var filter = { saveId: saveId };

      if (!callback) {
        return mongo.getAllByFilter(collection, filter, undefined);
      } else {
        mongo.getAllByFilter(collection, filter, undefined, callback);
      }
    }

    function isPlayerInSave (saveId, playerId, callback) {
      var filter = { saveId: saveId, playerId: playerId };

      if (!callback) {
        return mongo.getOneByFilter(collection, filter)
          .then(determineExistence);
      } else {
        mongo.getOneByFilter(collection, filter, function (record) {
          callback(record !== null);
        });
      }
    }

    function addPlayer (gameId, saveId, playerId, callback) {
      var record = {
        _id: uuid().gen(),
        saveId: saveId,
        gameId: gameId,
        playerId: playerId,
        updated: time().present()
      };

      if (callback) {
        mongo.store(collection, record, callback);
      } else {
        return mongo.store(collection, record);
      }
    }

    function getSavesForGameAndPlayer (gameId, playerId, callback) {
      var filter = { gameId: gameId, playerId: playerId };

      if (callback) {
        mongo.getAllByFilter(collection, filter, undefined, callback);
      } else {
        return mongo.getAllByFilter(collection, filter, undefined);
      }
    }

    function doesSaveHaveSpaceForPlayer (saveId, callback) {
      if (callback) {
        saves().get(saveId, function (save) {
          getPlayers(saveId, function (players) {
            callback(players.length < config.maxPlayers(save.ensemble.mode));
          });
        });
      } else {
        saves().get(saveId)
          .then(function(save) {
            return getPlayers(saveId)
              .then(function(players) {
                return (players.length < config.maxPlayers(save.ensemble.mode));
              });
          });
      }
    }

    function canPlayerJoinSave (saveId, playerId, callback) {
      if (callback) {
        saves().get(saveId, function (save) {
          if (save.ensemble.secret !== 'public') {
            callback(false);
            return;
          }

          doesSaveHaveSpaceForPlayer(saveId, callback);
        });
      } else {
        return saves().get(saveId)
          .then(function (save) {
            if (save.ensemble.secret !== 'public') {
              return false;
            }

            return doesSaveHaveSpaceForPlayer(saveId, callback);
          });
      }
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