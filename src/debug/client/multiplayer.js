'use strict';

module.exports = {
  type: 'OnClientReady',
  deps: ['Config', 'StateTracker', '$'],
  func: function DebugMultiplayer (config, tracker, $) {
    if (!config().debug.multiplayer) {
      return config().nothing;
    }

    function playerCount (state) {
      return state.ensembleDebug.players;
    }

    function updatePlayerCount (count) {
      $()('#player-count').text(count);
    }

    var multiplayerDebug = require('../../../public/partials/multiplayer-debug.jade');

    return function setup () {
      $()('#debug').append(multiplayerDebug());

    tracker().onChangeOf(playerCount, updatePlayerCount);
    };
  }
};