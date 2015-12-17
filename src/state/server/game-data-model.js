'use strict';

var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);
var gameSummaryFromGameState = require('../../util/adapter').gameSummaryFromGameState;

module.exports = {
  type: 'GamesDataModel',
  deps: ['Time'],
  func: function (time) {

    function all (callback) {
      mongo.getAll('games', gameSummaryFromGameState, callback);
    }

    function get (gameId, callback) {
      mongo.getById('games', gameId, callback);
    }

    function save (data, callback) {
      if (!data) {
        return;
      }

      data._id = data._id || data.ensemble.gameId;
      data.updated = time().present();

      mongo.store('games', data, callback);
    }


    return {
      all: all,
      get: get,
      save: save
    };
  }
};