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
  deps: ['Config', 'UUID', 'On', 'GamesList'],
  func: function Routes (config, uuid, on, games) {

    function getConfig (req, res) {
      res.json(config());
    }

    function createNewGame (req, res) {
      if (!req.body.mode) {
        return res.status(400).send('Missing mode');
      }

      var game = { id: uuid().gen(), mode: req.body.mode };
      on().newGame(game);
      res.redirect('/games/' + game.id);
    }

    function continueGame (req, res) {
      var game = games().get(req.params.gameId);
      if (!game) {
        return res.status(404).send('This game does not exist');
      }

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