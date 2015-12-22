'use strict';

var each = require('lodash').each;
var curry = require('lodash').curry;
var renderPage = require('../../util/request-handling').renderPage;
var buildJsonHandler = require('../../util/request-handling').buildJsonHandler;
var buildRequestHandler = require('../../util/request-handling').buildRequestHandler;
var renderPage = require('../../util/request-handling').renderPage;
var each = require('lodash').each;

function buildJson (project, player) {
  var json = {
    name: project.name,
    modes: project.modes,
    player: {
      name: player.name
    },
    links: [{
      name: 'Click here to see your saved games',
      what: '/game/player/saves',
      uri: '/players/' + player._id + '/saves',
      method: 'GET',
    }]
  };

   each(project.modes, function(mode) {
    json.links.push({
      name: mode,
      what: '/save/new',
      uri: '/saves',
      method: 'POST',
      data: {mode: mode}
    });
  });

  return json;
}

function createAcceptTypeHandlers (json) {
  return {
    'html': renderPage('index.jade', json),
    'json': buildJsonHandler(json)
  };
}

module.exports = {
  type: 'Routes',
  deps: ['GamePlayersDataModel', 'ActualGameDataModel'],
  func: function GameRoutes (gamePlayers, games) {

    function buildListSavesJson (game, player, callback) {
      var json = {
        game: {
          id: game._id,
          name: game.name
        },
        player: {
          id: player._id,
          name: player.name
        },
        saves: []
      };

      function addSavesToResponse (saves) {
         each(saves, function(save) {
          json.saves.push({
            name: save.saveId,
            what: '/save/continue',
            uri: '/saves/' + save.saveId,
            method: 'GET'
          });
        });

        callback(json);
      }

      gamePlayers().getSavesForGameAndPlayer(game._id, player._id, addSavesToResponse);
    }

    function buildListSavesHandler (game, player, callback) {
      function createAcceptTypeHandlers (json) {
        callback({
          'html': renderPage('saves.jade', json),
          'json': buildJsonHandler(json)
        });
      }

      buildListSavesJson(game, player, createAcceptTypeHandlers);
    }

    function buildHandler (project, player, callback) {
      callback(createAcceptTypeHandlers(buildJson(project, player)));
    }


    var keys = require('lodash').keys;
    function getSupportContentType (req, acceptTypeResponseHandlers) {
      return req.accepts(keys(acceptTypeResponseHandlers));
    }

    function configure (app, project) {
      app.get('/', buildRequestHandler(curry(buildHandler)(project)));

      app.get('/games/:gameId/players/:playerId/saves', function (req, res) {
        var gameId = req.params.gameId;

        games().getGame(gameId, function withGame (game) {
          var callbacks = curry(buildListSavesHandler)(game);
          callbacks(req.player, function (acceptTypeResponseHandlers) {
            var contentType = getSupportContentType(req, acceptTypeResponseHandlers);
            if (contentType) {
              return acceptTypeResponseHandlers[contentType](req, res);
            } else {
              var msg = 'The following Accept types supported: ' + keys(acceptTypeResponseHandlers).join(', ');

              return res.status(406).send(msg);
            }
          });
        });
      });
    }

    return {
      configure: configure
    };
  }
};