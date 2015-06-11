'use strict';

var filter = require('lodash').filter;
var plugins = require('plug-n-play').configure(['ServerSideUpdate', 'StateSeed', 'OnPlayerConnect', 'OnPlayerDisconnect', 'OnObserverConnect', 'OnObserverDisconnect', 'OnPause', 'OnUnpause', 'OnInput', 'OnConnect', 'OnDisonnect', 'ActionMap', 'AcknowledgementMap']);

//TODO: move this out
plugins.load({
  type: 'GamesList',
  func: function () {
    var games = [];

    return {
      all: function () {
        return games;
      },
      add: function (game) {
        games.push(game);
      },
      remove: function(id) {
        games = filter(games, function (game) { return game.id !== id; });
      },
      get: function (id) {
        return filter(games, function (game) { return game.id === id; });
      }
    };
  }
});

plugins.load(require('./server.js'));
plugins.load(require('./input/input_handler.js'));
plugins.load(require('./jobs/job_manager.js'));
plugins.load(require('./socket.js'));
plugins.load(require('./engine.js'));
plugins.load(require('./state/mutator.js'));
plugins.load(require('./events/on_pause.js'));
plugins.load(require('./events/on_unpause.js'));
plugins.load(require('./events/on_player_connected.js'));
plugins.load(require('./events/on_player_disconnected.js'));
plugins.load(require('./events/on_observer_connected.js'));
plugins.load(require('./events/on_observer_disconnected.js'));
plugins.load(require('./state/initialiser.js'));
plugins.load(require('./state/seed.js'));

var run = function (pathToGame, modes) {
  plugins.get('Server').start(pathToGame, modes);
  plugins.get('ServerSideEngine').run(120);
};

module.exports = {
  runGameAtPath: function (path) {
    console.log('ensemblejs@' + require('./version') + ' started.');

    plugins.loadPath(path + '/js/logic');
    plugins.loadPath(path + '/js/state');
    plugins.loadPath(path + '/js/events');
    plugins.loadPath(path + '/js/maps');

    if (require('fs').existsSync(path + '/js/modes.json')) {
      run(path, require(path + '/js/modes.json'));
    } else {
      run(path, ['game']);
    }
  },
};