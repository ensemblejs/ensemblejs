'use strict';

var isEqual = require('lodash').isEqual;
var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);
var summaryFromSaveState = require('../../util/adapter').summaryFromSaveState;

module.exports = {
  type: 'GamesDataModel',
  deps: ['Time'],
  func: function (time) {
    var collection = 'saves';

    function all () {
      return mongo.getAll(collection, summaryFromSaveState);
    }

    function get (gameId) {
      return mongo.getById(collection, gameId);
    }

    function save (data) {
      if (!data) {
        return;
      }

      data._id = data._id || data.ensemble.gameId;
      data.updated = time().present();

      return mongo.store(collection, data);
    }

    function determineIfGameIsPublic(game) {
      return isEqual(game.ensemble.secret, 'public');
    }

    function isGamePublic (gameId) {
      return get(gameId).then(determineIfGameIsPublic);
    }

    function isSecretCorrect (gameId, suppliedSecret) {
      return get(gameId)
        .then(function determineIfSecretIsCorrect(game) {
          var a = game.ensemble.secret.toLowerCase();
          var b = suppliedSecret.toLowerCase();

          return isEqual(a, b);
        });
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