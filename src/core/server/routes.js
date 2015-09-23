'use strict';

var each = require('lodash').each;
var keys = require('lodash').keys;

function buildIndexJson (game) {
  var index = {
    name: game.name,
    modes: game.modes,
    links: []
  };

  each(game.modes, function(mode) {
    index.links.push({
      name: mode,
      what: '/game/' + mode + '/new',
      uri: '/games',
      method: 'POST',
      data: { mode: mode }
    });
  });

  return index;
}

function buildJsonHandler (json) {
  return function jsonHandler (req, res) {
    res.json(json);
  };
}

function renderPage (page, opts) {
  return function pageHandler (req, res) {
    res.render(page, opts);
  };
}

function buildIndexHandler (game) {
  return {
    'html': renderPage('index.jade', buildIndexJson(game)),
    'json': buildJsonHandler(buildIndexJson(game))
  };
}

function buildHandler (callbacks) {
  return function handle (req, res) {
    var contentType = req.accepts(keys(callbacks));
    if (contentType) {
      return callbacks[contentType](req, res);
    }

    res.status(406).send('The following Accept types supported: ' + keys(callbacks).join(', '));
  };
}

module.exports = {
  type: 'Routes',
  deps: ['Config', 'UUID'],
  func: function Routes (config, uuid) {

    function getConfig (req, res) {
      res.json(config());
    }

    var games = {};

    function createNewGame (req, res) {
      if (!req.body.mode) {
        res.status(400).send('Missing mode');
      } else {
        var game = { gameId: uuid().gen(), mode: req.body.mode };
        games[game.gameId] = game;

        res.redirect('/games/' + game.gameId);
      }
    }

    function continueGame (req, res) {
      var gameId = req.params.gameId;

      if (!games[gameId]) {
        return res.status(404).send('This game does not exist');
      }

      var game = games[gameId];

      res.render('primary.jade', { mode: game.mode });
    }

    function configure (app, game) {
      app.get('/config', getConfig);
      app.get('/', buildHandler(buildIndexHandler(game)));
      app.post('/games', createNewGame);
      app.get('/games/:gameId', continueGame);
    }

    return {
      configure: configure
    };
  }
};