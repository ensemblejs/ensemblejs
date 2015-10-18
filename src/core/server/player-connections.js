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

    function getPlayer (gameId, sessionId) {
      if (!exists(gameId, sessionId)) {
        add(config().ensemble.maxPlayers, gameId, sessionId);
      }

      var connection = get(gameId, sessionId);
      if (!connection) {
        return undefined;
      }

      return connection.player;
    }

    define()('OnClientConnect', function Player () {
      return function determinePlayerId (state, socket, game) {
        var gameId = game.gameId;
        var sessionId = socket.request.sessionID;

        socket.emit('playerId', getPlayer(gameId, sessionId));
      };
    });

    define()('OnClientDisconnect', function Player () {
      return function indicatePlayerAsDisconnected (state, socket, game) {
        get(game.gameId, socket.request.sessionID).status = 'offline';
      };
    });

    return undefined;
  }
};