'use strict';

import {map, filter, first, each, reject, isNull} from 'lodash';
import Bluebird from 'bluebird';

var playersStore = require('../../util/models/players');
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');
var Address6 = require('ip-address').Address6;

const dead = 'dead';

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
        devices: [],
        status: 'online',
        number: inSave.length + 1,
        onSameSubnet: true
      });
    }

    function createNewPlayer (save, playerId) {
      add(config.get().maxPlayers(save.mode), save.id, playerId);
    }

    function markPlayerAsOnline (saveId, playerId) {
      var connection = get(saveId, playerId);
      connection.status = 'online';
    }

    function onSameSubnet (ipAddresses) {
      var anyFailures = false;

      each(ipAddresses, function (a) {
        if (anyFailures) {
          return;
        }

        each(ipAddresses, function (b) {
          if (anyFailures) {
            return;
          }

          if (!a.isInSubnet(b)) {
            anyFailures = true;
          }
        });
      });

      return !anyFailures;
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

      return connection;
    }

    function activeDevices (devices) {
      return reject(devices, {id: dead});
    }

    function getPlayers (save) {
      var players = map(savePlayers(save.id), function (connection) {
        return {
          number: connection.number,
          status: connection.status,
          devices: map(activeDevices(connection.devices), 'id'),
          playerId: connection.playerId,
          onSameSubnet: connection.onSameSubnet
        };
      });

      var maxPlayers = config.get().maxPlayers(save.mode);
      for (var i = players.length + 1; i <= maxPlayers; i += 1) {
        players.push(
          {number: i, status: 'not-joined', devices: [], onSameSubnet: true}
        );
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

    function validIpAddresses (devices) {
      return reject(map(devices, 'ip'), isNull);
    }

    define()('OnClientConnect', function PlayerConnections () {
      return function determinePlayerNumber (state, socket, save) {
        var deviceId = socket.request.sessionID;
        var ipAddress = new Address6(socket.client.conn.remoteAddress);

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
          .then(player => {
            player.devices.push({id: deviceId, ip: ipAddress});
            player.onSameSubnet = onSameSubnet(validIpAddresses(player.devices));

            socket.emit('playerNumber', player.number);
            socket.emit('deviceNumber', player.devices.length);
          })
          .then(() => on().playerGroupChange(getPlayers(save), save.id))
          .then(() => updateWaitingForPlayers())
          .catch(err => {
            logger.error({deviceId: deviceId, save: save}, err);
            socket.emit('error', err);
            return updateWaitingForPlayers();
          });
      };
    });

    function markDeviceSlotAsDead (devices, deviceId) {
      return map(devices, device => {
        if (device.id === deviceId) {
          return { id: dead, ip: null};
        } else {
          return device;
        }
      });
    }

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
          .then(connection => {
            connection.devices = markDeviceSlotAsDead(connection.devices, deviceId);

            connection.onSameSubnet = onSameSubnet(validIpAddresses(connection.devices));
            if (activeDevices(connection.devices).length === 0) {
              connection.status = 'offline';
            }
          })
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