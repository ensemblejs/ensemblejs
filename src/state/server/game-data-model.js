'use strict';

var isEqual = require('lodash').isEqual;
var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);
var gameSummaryFromGameState = require('../../util/adapter').gameSummaryFromGameState;

module.exports = {
  type: 'GamesDataModel',
  deps: ['Time'],
  func: function (time) {
    var collection = 'saves';

    function all (callback) {
      if (callback) {
        mongo.getAll(collection, gameSummaryFromGameState, callback);
      } else {
        return mongo.getAll(collection, gameSummaryFromGameState);
      }
    }

    function get (gameId, callback) {
      if (!callback) {
        return mongo.getById(collection, gameId);
      }

      mongo.getById(collection, gameId, callback);
    }

    function save (data, callback) {
      if (!data) {
        return;
      }

      data._id = data._id || data.ensemble.gameId;
      data.updated = time().present();

      if (callback) {
        mongo.store(collection, data, callback);
      } else {
        return mongo.store(collection, data);
      }
    }

    function isGamePublic (gameId, callback) {
      if (callback) {
        mongo.getById(collection, gameId, function (game) {
          callback(isEqual(game.ensemble.secret, 'public'));
        });
      } else {
        return mongo.getById(collection, gameId)
          .then(function (game) {
            return isEqual(game.ensemble.secret, 'public');
          });
      }
    }

    function isSecretCorrect (gameId, secret, callback) {
      if (callback) {
        mongo.getById(collection, gameId, function (game) {
          var a = game.ensemble.secret.toLowerCase();
          var b = secret.toLowerCase();

          callback(isEqual(a, b));
        });
      } else {
        return mongo.getById(collection, gameId)
          .then(function (game) {
            var a = game.ensemble.secret.toLowerCase();
            var b = secret.toLowerCase();

           return isEqual(a, b);
          });
      }
    }

    return {
      all: all,
      get: get,
      save: save,
      isSecretCorrect: isSecretCorrect,
      isGamePublic: isGamePublic
    };
  }
};