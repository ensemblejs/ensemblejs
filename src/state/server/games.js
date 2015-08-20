'use strict';

var filter = require('lodash').filter;

module.exports = {
  type: 'GamesList',
  func: function () {
    var games = [];

    return {
      all: function () {
        return games;
      },
      add: function (game) {
        games.push(game);
      },
      remove: function(id) {
        games = filter(games, function (game) { return game.id !== id; });
      },
      get: function (id) {
        return filter(games, function (game) { return game.id === id; });
      }
    };
  }
};
