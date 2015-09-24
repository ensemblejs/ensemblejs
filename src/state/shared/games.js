'use strict';

var first = require('lodash').first;
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
      games = reject(games, { id: id });
    }

    function get (id) {
      return first(filter(games, { id: id }));
    }

    define()('InternalState', function GamesList () {
      return {
        GamesList: {
          count: function count () { return games.length; }
        }
      };
    });

    define()('OnNewGame', function GamesList () {
      return function addGame (game) {
        add(game);
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
