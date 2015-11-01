'use strict';

function OnClientReady (tracker, $) {
  function updatePlayerCount (count) {
    $()('#player-count .value').text(count);
  }

  return function setup () {
    var rectSmall = require('../../../public/partials/dashboard/rect-small.jade');

    $()('#debug').append(rectSmall({
      id: 'player-count',
      title: 'Player Count',
      value: '0'
    }));

    tracker().onChangeOf('ensembleDebug.players', updatePlayerCount);
  };
}

module.exports = {
  type: 'DebugMultiplayer',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugMultiplayer (config, define) {
    if (!config().debug.multiplayer) {
      return;
    }

    define()('StateSeed', function DebugMultiplayer () {
      return {
        ensembleDebug: {
          players: 0
        }
      };
    });

    define()('OnClientConnect', function DebugMultiplayer () {
      return function incrementPlayerCount(state) {
        return {
          ensembleDebug: {
            players: state.get('ensembleDebug.players') + 1
          }
        };
      };
    });

    define()('OnClientDisconnect', function DebugMultiplayer () {
      return function decrementPlayerCount(state) {
        return {
          ensembleDebug: {
            players: state.get('ensembleDebug.players') - 1
          }
        };
      };
    });

    define()('OnClientReady', ['StateTracker', '$'], OnClientReady);
  }
};