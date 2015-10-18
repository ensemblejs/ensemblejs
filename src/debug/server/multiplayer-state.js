'use strict';

module.exports = {
  type: 'DebugMultiplayer',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugMultiplayer (config, define) {

    define()('StateSeed', function DebugMultiplayer () {
      if (!config().debug.multiplayer) {
        return {};
      }

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
            players: state.for('ensembleDebug').get('players') + 1
          }
        };
      };
    });

    define()('OnClientDisconnect', function DebugMultiplayer () {
      return function decrementPlayerCount(state) {
        return {
          ensembleDebug: {
            players: state.for('ensembleDebug').get('players') - 1
          }
        };
      };
    });
  }
};