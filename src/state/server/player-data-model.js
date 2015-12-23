'use strict';

var logger = require('../../logging/server/logger').logger;
var mongo = require('../../util/mongo').setup(logger);

module.exports = {
  type: 'PlayerDataModel',
  deps: ['Time'],
  func: function (time) {

    function get (player, callback) {
      if (callback) {
        mongo.getOneByFilter('players', player, callback);
      } else {
        return mongo.getOneByFilter('players', player);
      }
    }

    function save (player, callback) {
      if (callback) {
        if (!player) {
          callback();
        }

        player.updated = time().present();

        mongo.store('players', player, callback);
      } else {
        if (!player) {
          return;
        }

        player.updated = time().present();

        return mongo.store('players', player);
      }
    }

    return {
      get: get,
      save: save
    };
  }
};