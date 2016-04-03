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
    game: {
      id: project.id,
      name: project.name,
      modes: project.modes
    },
    player: {
      id: player.id
    },
    links: [{
      name: 'Click here to see your saved games',
      what: '/game/player/saves',
      uri: '/players/' + player.id + '/saves',
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
    'html': renderPage('index.pug', json),
    'json': buildJsonHandler(json)
  };
}

module.exports = {
  type: 'Routes',
  func: function GameRoutes () {
    function buildHandler (project, player, callback) {
      callback(createAcceptTypeHandlers(buildJson(project, player)));
    }

    function configure (app, project) {
      app.get('/', buildRequestHandler(curry(buildHandler)(project)));
    }

    return {
      configure: configure
    };
  }
};