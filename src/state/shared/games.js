'use strict';

var first = require('lodash').first;
var filter = require('lodash').filter;
var reject = require('lodash').reject;
var each = require('lodash').each;

module.exports = {
  type: 'GamesList',
  deps: ['DefinePlugin'],
  func: function (define) {
    var games = [];

    function all () {
      return games;
    }

    function loaded () {
      return filter(games, {loaded: true});
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

    define()('OnDatabaseReady', ['GamesDataModel'], function (games) {
      return function fillWithPotentialGames () {
        function registerAsUnloadedGame (games) {
          each(games, function (game) {
            game.loaded = false;

            add(game);
          });
        }

        games().all(registerAsUnloadedGame);
      };
    });

    define()('OnNewGame', function GamesList () {
      return function addGame (game) {
        add(game);
      };
    });

    define()('OnGameReady', function GamesList () {
      return function markGameAsLoaded (gameThatIsReady) {
        var game = get(gameThatIsReady.id);
        game.loaded = true;
      };
    });

    return {
      all: all,
      add: add,
      remove: remove,
      get: get,
      loaded: loaded
    };
  }
};
