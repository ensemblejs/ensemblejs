'use strict';

var each = require('lodash').each;
var keys = require('lodash').keys;
var curry = require('lodash').curry;
var config = require('../../util/config').get();

function renderPage (page, opts) {
  return function pageHandler (req, res) {
    res.render(page, opts);
  };
}

function buildJsonHandler (json) {
  return function jsonHandler (req, res) {
    res.json(json);
  };
}

function buildHandler (callbacks) {
  return function handle (req, res) {
    callbacks(req.player, function (callbackHandlers) {
      var contentType = req.accepts(keys(callbackHandlers));
      if (contentType) {
        return callbackHandlers[contentType](req, res);
      }

      res.status(406).send('The following Accept types supported: ' + keys(callbackHandlers).join(', '));
    });
  };
}

module.exports = {
  type: 'Routes',
  deps: ['UUID', 'On', 'GamesList', 'RawStateAccess', 'DbBridge'],
  func: function Routes (uuid, on, games, state, db) {

    function getConfig (req, res) {
      res.json(config);
    }

    function dumpState (req, res) {
      if (!config.debug.develop) {
        return res.status(400).send('Not available in release mode.');
      }

      res.json(state().for(req.params.saveId));
    }

    function saveFull (req, res) {
      res.render('full.jade', {
        title: config.game.title
      });
    }

    function createNewSave (req, res) {
      if (!req.body.mode) {
        return res.status(400).send('Missing mode');
      }

      var save = {
        id: uuid().gen(),
        mode: req.body.mode
      };

      on().newGame(save);
      on().gameReady(save);

      db().addPlayerToGame(save.id, req.player._id, function () {
        res.redirect('/saves/' + save.id);
      });
    }

    function continueSave (req, res) {
      var playerId = req.player._id;
      var save = games().get(req.params.saveId);
      if (!save) {
        return res.status(404).send('This save game does not exist');
      }

      function doesPlayerBelongToGame (result) {
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

      db().doesPlayerBelongToGame(save.id, playerId, doesPlayerBelongToGame);
    }

    function joinSave (player, callback) {
      var playerId = player._id;

      return function (req, res) {
        var save = games().get(req.params.saveId);

        if (!save) {
          return res.status(404).send('This game does not exist');
        }

        function doesPlayerBelongToGame (result) {
          if (result) {
            return res.redirect('/saves/' + save.id);
          }

          function canPlayerJoin (answer) {
            if (answer) {
              db().addPlayerToGame(save.id, playerId, function () {
                return res.redirect('/saves/' + save.id);
              });
            } else {
              callback(req, res);
            }
          }

          db().canPlayerJoin(save.id, playerId, canPlayerJoin);
        }

        db().doesPlayerBelongToGame(save.id, req.player._id, doesPlayerBelongToGame);
      };
    }

    function buildJoinHandler (project, player, callback) {
      callback({
        'html': joinSave(player, saveFull),
        'json': joinSave(player, saveFull)
      });
    }

    function buildSavesJson (project, player, callback) {
      var json = {
        name: project.name,
        player: {
          name: player.name
        },
        links: []
      };

      db().getGamesForPlayer(player._id, function (playerGames) {
         each(playerGames, function(playerGame) {
          json.links.push({
            name: playerGame.gameId,
            what: '/save/continue',
            uri: '/saves/' + playerGame.gameId,
            method: 'GET'
          });
        });

         callback(json);
      });
    }

    function buildSavesHandler (project, player, callback) {
      buildSavesJson(project, player, function (json) {
        callback({
          'html': renderPage('saves.jade', json),
          'json': buildJsonHandler(json)
        });
      });
    }

    function buildIndexJson (project, player, callback) {
      var json = {
        name: project.name,
        modes: project.modes,
        player: {
          name: player.name
        },
        links: []
      };

       each(project.modes, function(mode) {
        json.links.push({
          name: mode,
          what: '/save/new',
          uri: '/saves/',
          method: 'POST',
          data: {mode: mode}
        });
      });

      callback(json);
    }

    function buildIndexHandler (project, player, callback) {
      buildIndexJson(project, player, function (json) {
        callback({
        'html': renderPage('index.jade', json),
        'json': buildJsonHandler(json)
        });
      });
    }

    function determinePlayerId (req, res, next) {
      var player = {
        key: req.sessionID,
        keyType: 'sessionId',
      };

      function handleGetPlayer (data) {
        if (!data) {
          player._id = uuid().gen();
          player.name = player._id;

          db().savePlayer(player, handleSavePlayer);
        } else {
          req.player = data;
          next();
        }
      }

      function handleSavePlayer (data) {
        player._id = data.result.upserted[0]._id;
        db().getPlayer(player, handleGetPlayer);
      }

      db().getPlayer(player, handleGetPlayer);
    }

    function configure (app, project) {
      app.use(determinePlayerId);
      app.get('/config', getConfig);
      app.get('/', buildHandler(curry(buildIndexHandler)(project)));
      app.get('/saves', buildHandler(curry(buildSavesHandler)(project)));
      app.post('/saves', createNewSave);
      app.get('/saves/:saveId', continueSave);
      app.get('/saves/:saveId/join', buildHandler(curry(buildJoinHandler)(project)));
      // app.put('/saves/:saveId/join', joinSave);
      app.get('/saves/:saveId/full', saveFull);
      app.get('/saves/:saveId/data', dumpState);
    }

    return {
      configure: configure
    };
  }
};