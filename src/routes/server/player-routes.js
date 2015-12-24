'use strict';

var get = require('../../util/request-handling').buildGetRequestHandler;
var showPlayerSaves = require('../../util/workflow/show-player-saves');

module.exports = {
  type: 'Routes',
  func: function Routes () {

    function configure (app, project) {
      app.get('/players/:playerId/saves', get(
        showPlayerSaves(project), 'saves.jade')
      );
    }

    return {
      configure: configure
    };
  }
};