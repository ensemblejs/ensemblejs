'use strict';

var select = require('lodash').select;
var first = require('lodash').first;
var map = require('lodash').map;
var playerSource = require('../../util/models/players');
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');

module.exports = {
  type: 'PlayerConnections',
  deps: ['DefinePlugin', 'On'],
  func: function PlayerConnections (define, on) {
    var connections = [];

    function filterBySaveAndSession (saveId, sessionId) {
      return select(connections, {saveId: saveId, sessionId: sessionId});
    }

    function connectedPlayers (saveId) {
      return select(connections, { saveId: saveId, status: 'online' });
    }

    function savePlayers (saveId) {
      return select(connections, { saveId: saveId });
    }

    function exists (saveId, sessionId) {
      return filterBySaveAndSession(saveId, sessionId).length > 0;
    }

    function get (saveId, sessionId) {
      return first(filterBySaveAndSession(saveId, sessionId));
    }

    function add (maxPlayers, saveId, sessionId) {
      var inSave = select(connections, {saveId: saveId});
      if (inSave.length === maxPlayers) {
        return;
      }

      connections.push({
        saveId: saveId,
        sessionId: sessionId,
        playerId: undefined,
        status: 'online',
        number: inSave.length + 1
      });
    }

    function createNewPlayer (save, sessionId) {
      add(config.get().maxPlayers(save.mode), save.id, sessionId);
    }

    function markPlayerAsOnline (saveId, sessionId) {
      var connection = get(saveId, sessionId);
      connection.status = 'online';
    }

    function addPlayer (save, sessionId) {
      if (!exists(save.id, sessionId)) {
        createNewPlayer(save, sessionId);
      } else {
        markPlayerAsOnline(save.id, sessionId);
      }

      var connection = get(save.id, sessionId);
      if (!connection) {
        return undefined;
      }

      return connection.number;
    }

    function getPlayers (save) {
      var players = map(savePlayers(save.id), function (connection) {
        return {
          id: connection.number,
          status: connection.status
        };
      });

      var maxPlayers = config.get().maxPlayers(save.mode);
      for (var i = players.length + 1; i <= maxPlayers; i += 1) {
        players.push({id: i, status: 'not-joined'});
      }

      return players;
    }

    function connectedCount (saveId) {
      return connectedPlayers(saveId).length;
    }

    function determineIfWaitingForPlayers (save) {
      return (connectedCount(save.id) < config.get().minPlayers(save.mode));
    }

    define()('OnClientConnect', function PlayerConnections () {
      return function determinePlayerId (state, socket, save) {
        var sessionId = socket.request.sessionID;
        var playerNumber = addPlayer(save, sessionId);
        socket.emit('playerNumber', playerNumber);

        playerSource.getByKey(sessionId, 'sessionId').then(function (player) {
          var connection = get(save.id, socket.request.sessionID);
          connection.playerId = player._id;
        });

        on().playerGroupChange(getPlayers(save), save.id);

        return [
          'ensemble.waitingForPlayers', determineIfWaitingForPlayers(save)
        ];
      };
    });

    define()('OnClientDisconnect', function PlayerConnections () {
      return function indicatePlayerAsDisconnected (state, socket, save) {
        var connection = get(save.id, socket.request.sessionID);
        if (!connection) {
          logger.error({socket: socket, save: save}, 'Connection not found when disconnecting player.');
        }

        connection.status = 'offline';

        on().playerGroupChange(getPlayers(save), save.id);

        return [
          'ensemble.waitingForPlayers', determineIfWaitingForPlayers(save)
        ];
      };
    });

    return {
      connectedCount: connectedCount
    };
  }
};