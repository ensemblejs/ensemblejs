'use strict';

var select = require('lodash').select;
var first = require('lodash').first;

module.exports = {
  type: 'PlayerConnections',
  deps: ['DefinePlugin', 'Config'],
  func: function PlayerConnections (define, config) {
    var connections = [];

    function filterByGameAndSession (gameId, sessionId) {
      return select(connections, {gameId: gameId, sessionId: sessionId});
    }

    function exists (gameId, sessionId) {
      return filterByGameAndSession(gameId, sessionId).length > 0;
    }

    function get (gameId, sessionId) {
      return first(filterByGameAndSession(gameId, sessionId));
    }

    function add (maxPlayers, gameId, sessionId) {
      var inGame = select(connections, {gameId: gameId});
      if (inGame.length === maxPlayers) {
        return;
      }

      connections.push({
        gameId: gameId,
        sessionId: sessionId,
        status: 'online',
        player: inGame.length + 1
      });
    }

    function addPlayer (game, sessionId) {
      if (!exists(game.id, sessionId)) {
        add(getMaxPlayerCount(game.mode), game.id, sessionId);
      }

      var connection = get(game.id, sessionId);
      if (!connection) {
        return undefined;
      }

      return connection.player;
    }

    function connectedCount (gameId) {
      return select(connections, { gameId: gameId, status: 'online' }).length;
    }

    function getMinPlayerCount (mode) {
      if (config()[mode] && config()[mode].minPlayers) {
        return config()[mode].minPlayers;
      }

      return config().ensemble.minPlayers;
    }

    function getMaxPlayerCount (mode) {
      if (config()[mode] && config()[mode].maxPlayers) {
        return config()[mode].maxPlayers;
      }

      return config().ensemble.maxPlayers;
    }

    define()('OnClientConnect', function PlayerConnections () {
      return function determinePlayerId (state, socket, game) {
        var sessionId = socket.request.sessionID;

        socket.emit('playerId', addPlayer(game, sessionId));

        return {
          ensemble: {
            waitingForPlayers: (connectedCount(game.id) < getMinPlayerCount(game.mode))
          }
        };
      };
    });

    define()('OnClientDisconnect', function PlayerConnections () {
      return function indicatePlayerAsDisconnected (state, socket, game) {
        get(game.id, socket.request.sessionID).status = 'offline';

        return {
          ensemble: {
            waitingForPlayers: (connectedCount(game.id) < getMinPlayerCount(game.mode))
          }
        };
      };
    });

    return {
      connectedCount: connectedCount
    };
  }
};