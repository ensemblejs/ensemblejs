'use strict';

var filter = require('lodash').filter;
var reject = require('lodash').reject;

module.exports = {
  type: 'GamesList',
  deps: ['DefinePlugin'],
  func: function (define) {
    var games = [];

    define()('InternalState', function GamesList () {
      return {
        GamesList: {
          count: function count () { return games.length; }
        }
      };
    });

    return {
      all: function () {
        return games;
      },
      add: function (game) {
        games.push(game);
      },
      remove: function(id) {
        games = reject(games, function (game) { return game.id === id; });
      },
      get: function (id) {
        return filter(games, function (game) { return game.id === id; });
      }
    };
  }
};
