'use strict';

var curry = require('lodash').curry;
var contains = require('lodash').contains;
var config = require('../../util/config').get();

var buildRequestHandler = require('../../util/request-handling').buildRequestHandler;

module.exports = {
  type: 'Routes',
  deps: ['UUID', 'On', 'GamesList', 'GamePlayersDataModel'],
  func: function Routes (uuid, on, games, gamePlayers) {

    function saveFull (req, res) {
      res.render('full.jade', { title: config.game.title });
    }

    function buildCreateNewSaveHandler (project) {
      return function createNewSave (req, res) {
        if (!req.body.mode) {
          return res.status(400).send('Missing mode');
        }
        if (!contains(project.modes, req.body.mode)) {
          return res.status(400).send('Invalid mode. Supported modes are: ' + project.modes.join(', '));
        }

        var newSaveGame = {
          id: uuid().gen(),
          mode: req.body.mode
        };

        on().newGame(newSaveGame);
        on().gameReady(newSaveGame);

        gamePlayers().addPlayer(newSaveGame.id, req.player._id, function () {
          res.redirect('/saves/' + newSaveGame.id);
        });
      };
    }

    function continueSave (req, res) {
      var playerId = req.player._id;

      var save = games().get(req.params.saveId);
      if (!save) {
        return res.status(404).send('This save game does not exist.');
      }

      function playerInGameResult (result) {
        if (!result) {
          return res.redirect('/saves/' + save.id + '/join');
        }

        if (!save.loaded) {
          on().loadGame(save);
        }

        res.render('primary.jade', {
          mode: save.mode,
          dashboard: config.ensemble.dashboard,
          debugMode: config.debug.enabled
        });
      }

      gamePlayers().isPlayerInGame(save.id, playerId, playerInGameResult);
    }

    function buildJoinSaveHandler (player, playerCantJoinCallback) {
      var playerId = player._id;

      return function joinSaveHandler (req, res) {
        var save = games().get(req.params.saveId);
        if (!save) {
          return res.status(404).send('This game does not exist');
        }

        function redirectPlayerToPlayGameRoute () {
          res.redirect('/saves/' + save.id);
        }

        function canPlayerJoinGameResult (playerCanJoin) {
          if (playerCanJoin) {
            gamePlayers().addPlayer(save.id, playerId, redirectPlayerToPlayGameRoute);
          } else {
            playerCantJoinCallback(req, res);
          }
        }

        function playerInGameResult (result) {
          if (result) {
            return redirectPlayerToPlayGameRoute();
          }

          gamePlayers().canPlayerJoinGame(save.id, playerId, canPlayerJoinGameResult);
        }

        gamePlayers().isPlayerInGame(save.id, req.player._id, playerInGameResult);
      };
    }

    function buildJoinHandler (project, player, callback) {
      function orRedirectToFull (req, res) {
        res.redirect('/saves/' + req.params.saveId + '/full');
      }

      callback({
        'html': buildJoinSaveHandler(player, orRedirectToFull),
        'json': buildJoinSaveHandler(player, orRedirectToFull)
      });
    }

    function configure (app, project) {
      app.post('/saves', buildCreateNewSaveHandler(project));

      app.get('/saves/:saveId', continueSave);
      app.get('/saves/:saveId/join', buildRequestHandler(curry(buildJoinHandler)(project)));
      app.get('/saves/:saveId/full', saveFull);
    }

    return {
      configure: configure
    };
  }
};