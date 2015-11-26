'use strict';

var select = require('lodash').select;
var first = require('lodash').first;
var map = require('lodash').map;

module.exports = {
  type: 'PlayerConnections',
  deps: ['DefinePlugin', 'Config', 'Logger', 'On'],
  func: function PlayerConnections (define, config, logger, on) {
    var connections = [];

    function filterByGameAndSession (gameId, sessionId) {
      return select(connections, {gameId: gameId, sessionId: sessionId});
    }

    function connectedPlayers (gameId) {
      return select(connections, { gameId: gameId, status: 'online' });
    }

    function gamePlayers (gameId) {
      return select(connections, { gameId: gameId });
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

    function createNewPlayer (game, sessionId) {
      add(config().maxPlayers(game.mode), game.id, sessionId);
    }

    function markPlayerAsOnline (gameId, sessionId) {
      var connection = get(gameId, sessionId);
      connection.status = 'online';
    }

    function addPlayer (game, sessionId) {
      if (!exists(game.id, sessionId)) {
        createNewPlayer(game, sessionId);
      } else {
        markPlayerAsOnline(game.id, sessionId);
      }

      var connection = get(game.id, sessionId);
      if (!connection) {
        return undefined;
      }

      return connection.player;
    }

    function getPlayers (game) {
      var players = map(gamePlayers(game.id), function (connection) {
        return {
          id: connection.player,
          status: connection.status
        };
      });

      var maxPlayers = config().maxPlayers(game.mode);
      for (var i = players.length + 1; i <= maxPlayers; i += 1) {
        players.push({id: i, status: 'not-joined'});
      }

      return players;
    }

    function connectedCount (gameId) {
      return connectedPlayers(gameId).length;
    }

    function determineIfWaitingForPlayers (game) {
      return (connectedCount(game.id) < config().minPlayers(game.mode));
    }

    define()('OnClientConnect', function PlayerConnections () {
      return function determinePlayerId (state, socket, game) {
        var sessionId = socket.request.sessionID;

        var playerId = addPlayer(game, sessionId);
        socket.emit('playerId', playerId);

        on().playerGroupChange(getPlayers(game), game.id);

        return {
          ensemble: {
            waitingForPlayers: determineIfWaitingForPlayers(game)
          }
        };
      };
    });

    define()('OnClientDisconnect', function PlayerConnections () {
      return function indicatePlayerAsDisconnected (state, socket, game) {
        var connection = get(game.id, socket.request.sessionID);
        if (!connection) {
          logger().error({socket: socket, game: game}, 'Connection not found when disconnecting player.');
        }

        connection.status = 'offline';

        on().playerGroupChange(getPlayers(game), game.id);

        return {
          ensemble: {
            waitingForPlayers: determineIfWaitingForPlayers(game)
          }
        };
      };
    });

    return {
      connectedCount: connectedCount
    };
  }
};