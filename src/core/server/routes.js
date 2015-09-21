'use strict';

var each = require('lodash').each;
var keys = require('lodash').keys;

function buildIndexJson (modes) {
  var index = {
    modes: modes,
    links: []
  };

  each(modes, function(mode) {
    index.links.push({
      what: '/game/new',
      uri: '/games',
      method: 'POST',
      data: { mode: mode }
    });
  });

  return function modesList (req, res) {
    res.json(index);
  };
}

function indexHtml (req, res) {
  res.render('index.jade');
}

function buildIndexHandler (modes) {
  return {
    'html': indexHtml,
    'json': buildIndexJson(modes)
  };
}

function buildHandler (callbacks) {
  return function handle (req, res) {
    var contentType = req.accepts(keys(callbacks));
    if (contentType) {
      return callbacks[contentType](req, res);
    }

    res.status(406).send();
  };
}

module.exports = {
  type: 'Routes',
  deps: ['Config', 'UUID', 'Metrics'],
  func: function Routes (config, uuid, metrics) {

    function getConfig (req, res) {
      res.json(config());
    }

    var games = {};

    function createNewGame (req, res) {
      if (!req.body.mode) {
        res.status(400).send('Missing mode');
      } else {
        var game = { id: uuid().gen(), mode: req.body.mode };
        games[game.id] = game;

        metrics().event('new-game', game);

        res.redirect(game.id);
      }
    }

    function continueGame (req, res) {
      var gameId = req.params.gameId;

      if (!games[gameId]) {
        return res.status(404).send();
      }

      var game = games[gameId];

      metrics().event('continue-game', game);

      res.render('primary.jade', { mode: game.mode });
    }

    function configure (app, modes) {
      app.get('/config', getConfig);
      app.get('/', buildHandler(buildIndexHandler(modes)));
      app.post('/games', createNewGame);
      app.get('/games/:gameId', continueGame);
    }

    return {
      configure: configure
    };
  }
};