'use strict';

var curry = require('lodash').curry;
var contains = require('lodash').contains;
var config = require('../../util/config').get();
var logger = require('../../logging/server/logger').logger;

var bitly;
if (process.env.BITLY_KEY) {
  var Bitly = require('bitly');
  console.log(process.env.BITLY_KEY);
  bitly = new Bitly(process.env.BITLY_KEY);
}

var buildRequestHandler = require('../../util/request-handling').buildRequestHandler;

module.exports = {
  type: 'Routes',
  deps: ['UUID', 'On', 'GamesList', 'GamePlayersDataModel', 'GamesDataModel'],
  func: function Routes (uuid, on, saves, gamePlayers, games) {

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
          res.redirect('/saves/' + newSaveGame.id + '/share');
        });
      };
    }

    function continueSave (req, res) {
      var playerId = req.player._id;

      var save = saves().get(req.params.saveId);
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
        var save = saves().get(req.params.saveId);
        if (!save) {
          res.status(404).send('This game does not exist');
          return;
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

        function playerInGameResult (playerIsInGame) {
          if (playerIsInGame) {
            redirectPlayerToPlayGameRoute();
            return;
          }

          gamePlayers().canPlayerJoinGame(save.id, playerId, canPlayerJoinGameResult);
        }

        gamePlayers().isPlayerInGame(save.id, playerId, playerInGameResult);
      };
    }

    function buildJoinJson (project, player, saveId) {
      return {
        name: project.name,
        player: {
          name: player.name
        },
        join: {
          method: 'POST',
          what: '/save/join',
          uri: '/saves/' + saveId + '/join',
          name: 'Join Game'
        }
      };
    }

    function buildJoinHandler (project, player, callback) {
      function renderJoinOrRedirectToFull (req, res) {
        var saveId = req.params.saveId;

        function doesGameHaveSpace (gameHasSpace) {
          if (gameHasSpace) {
            res.render('join.jade', buildJoinJson(project, player, saveId));
          } else {
            res.redirect('/saves/' + saveId + '/full');
          }
        }

        gamePlayers().doesGameHaveSpaceForPlayer(req.params.saveId, doesGameHaveSpace);
      }

      callback({
        'html': buildJoinSaveHandler(player, renderJoinOrRedirectToFull),
        'json': buildJoinSaveHandler(player, renderJoinOrRedirectToFull)
      });
    }

    function buildAddPlayerHandler (project, player, callback) {
      function addPlayerOrRedirectToFull (req, res) {
        var saveId = req.params.saveId;
        var secret = req.body.secret;

        function doesGameHaveSpace (gameHasSpace) {
          if (gameHasSpace) {
            games().isSecretCorrect(saveId, secret, function (secretIsCorrect) {
              if (secretIsCorrect) {
                gamePlayers().addPlayer(saveId, player._id, function () {
                  res.redirect('/saves/' + saveId);
                });
              } else {
                res.redirect('/saves/' + saveId + '/join');
              }
            });
          } else {
            res.redirect('/saves/' + saveId + '/full');
          }
        }

        gamePlayers().doesGameHaveSpaceForPlayer(req.params.saveId, doesGameHaveSpace);
      }

      callback({
        'html': buildJoinSaveHandler(player, addPlayerOrRedirectToFull),
        'json': buildJoinSaveHandler(player, addPlayerOrRedirectToFull)
      });
    }

    function buildShareJson (save, project, player, hostname, callback) {
      var json = {
        name: project.name,
        player: {
          name: player.name
        },
        shareUrl: hostname + '/saves/' + save.id + '/join',
        shortUrl: undefined,
        secret: undefined,
        links: [{
          what: '/save/continue',
          uri: hostname + '/saves/' + save.id,
          name: 'Now Play that game',
          method: 'GET'
        }, {
          what: '/save/join',
          uri: hostname + '/saves/' + save.id + '/join',
          name: hostname + '/saves/' + save.id + '/join',
          method: 'GET'
        }, {
          what: '/game',
          uri: hostname + '/',
          name: hostname + '/',
          method: 'GET'
        }]
      };

      function addShortUrlToLinks (response) {
        if (response.status !== 200) {
          logger.error('Unable to shorten URL', response);
        } else {
          json.shortUrl = response.data.url;
          json.links.push({
            what: '/save/join/shortUrl',
            uri: response.data.url,
            name: response.data.url,
            method: 'GET'
          });
        }

        callback(json);
      }

      function shortenUrl () {
        if (bitly) {
          bitly.shorten(hostname + '/saves/' + save.id + '/join')
            .then(addShortUrlToLinks, function logBitlyError (error) {
              logger.error('Unable to shorten URL', error);
            });
        } else {
          callback(json);
        }
      }

      games().get(save.id, function withGame (game) {
        json.secret = game.ensemble.secret;

        shortenUrl();
      });
    }

    function buildShareSaveHandler (project, player, callback) {
      var playerId = player._id;

      return function shareSaveHandler (req, res) {
        var save = saves().get(req.params.saveId);
        if (!save) {
          res.status(404).send('This game does not exist');
          return;
        }

        function playerInGameResult (playerIsInGame) {
          if (!playerIsInGame) {
            res.redirect('/saves/' + save.id + '/join');
            return;
          }

          var hostname = 'http://' + req.headers.host;
          buildShareJson(save, project, player, hostname, function (json) {
            callback(res, json);
          });
        }

        gamePlayers().isPlayerInGame(save.id, playerId, playerInGameResult);
      };
    }

    function buildShareHandler (project, player, callback) {
      callback({
        'html': buildShareSaveHandler(project, player, function (res, json) {
          res.render('share.jade', json);
        }),
        'json': buildShareSaveHandler(project, player, function (res, json) {
          res.json(json);
        })
      });
    }

    function configure (app, project) {
      app.post('/saves', buildCreateNewSaveHandler(project));

      app.get('/saves/:saveId', continueSave);
      app.get('/saves/:saveId/join', buildRequestHandler(curry(buildJoinHandler)(project)));
      app.post('/saves/:saveId/join', buildRequestHandler(curry(buildAddPlayerHandler)(project)));
      app.get('/saves/:saveId/full', saveFull);
      app.get('/saves/:saveId/share', buildRequestHandler(curry(buildShareHandler)(project)));
    }

    return {
      configure: configure
    };
  }
};