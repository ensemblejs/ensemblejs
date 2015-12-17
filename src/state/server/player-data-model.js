'use strict';

var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);

module.exports = {
  type: 'PlayerDataModel',
  deps: ['Time'],
  func: function (time) {

    function get (player, callback) {
      mongo.getOneByFilter('players', player, callback);
    }

    function save (player, callback) {
      if (!player) {
        callback();
      }

      player.updated = time().present();

      mongo.store('players', player, callback);
    }

    return {
      get: get,
      save: save
    };
  }
};