'use strict';

var filter = require('lodash').filter;
var reject = require('lodash').reject;

module.exports = {
  type: 'GamesList',
  deps: ['DefinePlugin'],
  func: function (define) {
    var games = [];

    function all () {
      return games;
    }

    function add (game) {
      games.push(game);
    }

    function remove (id) {
      games = reject(games, function (game) { return game.id === id; });
    }

    function get (id) {
      return filter(games, function (game) { return game.id === id; });
    }

    define()('InternalState', function GamesList () {
      return {
        GamesList: {
          count: function count () { return games.length; }
        }
      };
    });

    define()('OnClientConnect', function GamesList () {
      return function addGame (state, socket, game) {
        add(game);
      };
    });

    define()('OnClientDisconnect', function GamesList () {
      return function removeGame (state, socket, game) {
        remove(game.id);
      };
    });

    return {
      all: all,
      add: add,
      remove: remove,
      get: get
    };
  }
};
