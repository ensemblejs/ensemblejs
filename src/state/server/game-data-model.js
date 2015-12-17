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
      mongo.getAll(collection, gameSummaryFromGameState, callback);
    }

    function get (gameId, callback) {
      mongo.getById(collection, gameId, callback);
    }

    function save (data, callback) {
      if (!data) {
        return;
      }

      data._id = data._id || data.ensemble.gameId;
      data.updated = time().present();

      mongo.store(collection, data, callback);
    }

    function isSecretCorrect (gameId, secret, callback) {
      mongo.getById(collection, gameId, function (game) {
        var a = game.ensemble.secret.toLowerCase();
        var b = secret.toLowerCase();

        callback(isEqual(a, b));
      });
    }

    return {
      all: all,
      get: get,
      save: save,
      isSecretCorrect: isSecretCorrect
    };
  }
};