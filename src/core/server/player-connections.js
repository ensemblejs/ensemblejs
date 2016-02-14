'use strict';

import {map, filter, first} from 'lodash';
import Bluebird from 'bluebird';

var playersStore = require('../../util/models/players');
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');

module.exports = {
  type: 'PlayerConnections',
  deps: ['DefinePlugin', 'On'],
  func: function PlayerConnections (define, on) {
    var connections = [];

    function filterBySaveAnPlayer (saveId, playerId) {
      return filter(connections, {saveId: saveId, playerId: playerId});
    }

    function connectedPlayers (saveId) {
      return filter(connections, { saveId: saveId, status: 'online' });
    }

    function savePlayers (saveId) {
      return filter(connections, { saveId: saveId });
    }

    function exists (saveId, playerId) {
      return filterBySaveAnPlayer(saveId, playerId).length > 0;
    }

    function get (saveId, playerId) {
      return first(filterBySaveAnPlayer(saveId, playerId));
    }

    function add (maxPlayers, saveId, playerId) {
      var inSave = filter(connections, {saveId: saveId});
      if (inSave.length === maxPlayers) {
        return;
      }

      connections.push({
        saveId: saveId,
        playerId: playerId,
        status: 'online',
        number: inSave.length + 1
      });
    }

    function createNewPlayer (save, playerId) {
      add(config.get().maxPlayers(save.mode), save.id, playerId);
    }

    function markPlayerAsOnline (saveId, playerId) {
      var connection = get(saveId, playerId);
      connection.status = 'online';
    }

    function addPlayer (save, playerId) {
      if (!exists(save.id, playerId)) {
        createNewPlayer(save, playerId);
      } else {
        markPlayerAsOnline(save.id, playerId);
      }

      var connection = get(save.id, playerId);
      if (!connection) {
        return undefined;
      }

      return connection.number;
    }

    function getPlayers (save) {
      var players = map(savePlayers(save.id), function (connection) {
        return {
          number: connection.number,
          status: connection.status
        };
      });

      var maxPlayers = config.get().maxPlayers(save.mode);
      for (var i = players.length + 1; i <= maxPlayers; i += 1) {
        players.push({number: i, status: 'not-joined'});
      }

      return players;
    }

    function connectedCount (saveId) {
      return connectedPlayers(saveId).length;
    }

    function determineIfWaitingForPlayers (save) {
      return (connectedCount(save.id) < config.get().minPlayers(save.mode));
    }

    function redirectIfMoreThanOnePlayer (players) {
      if (players.length > 1) {
        return Bluebird.reject('Too many players on the dance floor');
      }

      return players[0];
    }

    function redirectIfNoPlayer (players) {
      if (players.length === 0) {
        return Bluebird.reject('No players for device');
      }

      return players;
    }

    function logErrorIfNoConnectionFound (connection) {
      if (!connection) {
        Bluebird.reject('Connection not found when disconnecting player.');
      }

      return connection;
    }

    function redirectIfPlayerIsNotInSave (player) {
      //implement this
      return player;
    }

    define()('OnClientConnect', function PlayerConnections () {
      return function determinePlayerNumber (state, socket, save) {
        var deviceId = socket.request.sessionID;

        function updateWaitingForPlayers () {
          return [
            'ensemble.waitingForPlayers', determineIfWaitingForPlayers(save)
          ];
        }

        return playersStore.getByDevice(deviceId)
          .then(redirectIfNoPlayer)
          .then(redirectIfMoreThanOnePlayer)
          .then(redirectIfPlayerIsNotInSave)
          .then(player => addPlayer(save, player.id))
          .then(playerNumber => socket.emit('playerNumber', playerNumber))
          .then(() => on().playerGroupChange(getPlayers(save), save.id))
          .then(() => updateWaitingForPlayers())
          .catch(err => {
            logger.error({deviceId: deviceId, save: save}, err);
            socket.emit('error', err);
            return updateWaitingForPlayers();
          });
      };
    });

    define()('OnClientDisconnect', function PlayerConnections () {
      return function indicatePlayerAsDisconnected (state, socket, save) {
        var deviceId = socket.request.sessionID;

        function updateWaitingForPlayers () {
          return [
            'ensemble.waitingForPlayers', determineIfWaitingForPlayers(save)
          ];
        }

        return playersStore.getByDevice(deviceId)
          .then(redirectIfNoPlayer)
          .then(redirectIfMoreThanOnePlayer)
          .then(player => get(save.id, player.id))
          .then(logErrorIfNoConnectionFound)
          .then(connection => connection.status = 'offline')
          .then(() => on().playerGroupChange(getPlayers(save), save.id))
          .then(() => updateWaitingForPlayers())
          .catch(err => {
            logger.error({deviceId: deviceId, save: save}, err);
            return updateWaitingForPlayers();
          });
      };
    });

    return {
      connectedCount: connectedCount
    };
  }
};