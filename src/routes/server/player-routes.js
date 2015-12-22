'use strict';

var each = require('lodash').each;
var curry = require('lodash').curry;

var renderPage = require('../../util/request-handling').renderPage;
var buildJsonHandler = require('../../util/request-handling').buildJsonHandler;
var buildRequestHandler = require('../../util/request-handling').buildRequestHandler;

module.exports = {
  type: 'Routes',
  deps: ['GamePlayersDataModel'],
  func: function Routes (gamePlayers) {

    function buildJson (project, player, callback) {
      var json = {
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

      gamePlayers().getGamesForPlayer(player._id, addSavesToResponse);
    }

    function buildHandler (project, player, callback) {
      function createAcceptTypeHandlers (json) {
        callback({
          'html': renderPage('saves.jade', json),
          'json': buildJsonHandler(json)
        });
      }

      buildJson(project, player, createAcceptTypeHandlers);
    }

    function configure (app, project) {
      app.get('/players/:playerId/saves', buildRequestHandler(curry(buildHandler)(project)));
    }

    return {
      configure: configure
    };
  }
};