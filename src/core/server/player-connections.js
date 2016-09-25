'use strict';

import {map, filter, first, each, reject, isNull} from 'lodash';
import Bluebird from 'bluebird';

const playersStore = require('../../util/models/players');
const logger = require('../../logging/server/logger').logger;
const config = require('../../util/config');
const Address6 = require('ip-address').Address6;

const dead = 'dead';

module.exports = {
  type: 'PlayerConnections',
  deps: ['DefinePlugin', 'On', 'StatePusher'],
  func: function PlayerConnections (define, on, statePusher) {
    const connections = [];

    function filterBySaveAnPlayer (saveId, playerId) {
      return filter(connections, { saveId, playerId});
    }

    function connectedPlayers (saveId) {
      return filter(connections, { saveId, status: 'online' });
    }

    function savePlayers (saveId) {
      return filter(connections, { saveId });
    }

    function exists (saveId, playerId) {
      return filterBySaveAnPlayer(saveId, playerId).length > 0;
    }

    function get (saveId, playerId) {
      return first(filterBySaveAnPlayer(saveId, playerId));
    }

    function add (maxPlayers, save, playerId) {
      const inSave = filter(connections, {saveId: save.id});
      if (inSave.length === maxPlayers) {
        return;
      }

      const connection = {
        saveId: save.id,
        playerId,
        devices: [],
        status: 'online',
        number: inSave.length + 1,
        onSameSubnet: true
      };

      connections.push(connection);

      on().newPlayer(save, connection.number);
    }

    function createNewPlayer (save, playerId) {
      add(config.get().maxPlayers(save.mode), save, playerId);
    }

    function markPlayerAsOnline (saveId, playerId) {
      const connection = get(saveId, playerId);
      connection.status = 'online';
    }

    //Move to utility function
    function onSameSubnet (ipAddresses) {
      let anyFailures = false;

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

      const connection = get(save.id, playerId);
      if (!connection) {
        return undefined;
      }

      return connection;
    }

    function activeDevices (devices) {
      return reject(devices, {id: dead});
    }

    function getPlayers (save) {
      const players = map(savePlayers(save.id), function (connection) {
        return {
          number: connection.number,
          status: connection.status,
          devices: map(activeDevices(connection.devices), 'id'),
          playerId: connection.playerId,
          onSameSubnet: connection.onSameSubnet
        };
      });

      const maxPlayers = config.get().maxPlayers(save.mode);
      for (let i = players.length + 1; i <= maxPlayers; i++) {
        players.push(
          {number: i, status: 'not-joined', devices: [], onSameSubnet: true}
        );
      }

      return players;
    }

    function connectedCount (saveId) {
      return connectedPlayers(saveId).length;
    }

    function onlineCount (saveId) {
      return filter(connectedPlayers(saveId), {'status': 'online'}).length;
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
      console.error('TODO: Redirect player as they are not in the save');
      return player;
    }

    function validIpAddresses (devices) {
      return reject(map(devices, 'ip'), isNull);
    }

    define()('OnClientConnect', function OnClientConnect () {
      return function determinePlayerNumber (state, socket, save) {
        const deviceId = socket.request.sessionID;
        const ipAddress = new Address6(socket.client.conn.remoteAddress);

        function updateWaitingForPlayers () {
          return ['ensemble.waitingForPlayers', determineIfWaitingForPlayers(save)];
        }

        const addDeviceToPlayer = (player) => {
          const deviceInfo = {id: deviceId, ip: ipAddress, number: player.devices.length + 1 };
          player.devices.push(deviceInfo);

          return [player, deviceInfo];
        }

        const notifyClientofPlayerNumber = (player, deviceInfo) => {
          socket.emit('playerNumber', player.number);

          return [player, deviceInfo];
        }

        const notifyClientOfDeviceNumber = (player, deviceInfo) => {
          socket.emit('deviceNumber', deviceInfo.number);

          return [player, deviceInfo.number]
        }

        const determineIfOnSameSubnet = (player, deviceNumber) => {
          player.onSameSubnet = onSameSubnet(validIpAddresses(player.devices));

          return [player, deviceNumber]
        }

        return playersStore.getByDevice(deviceId)
          .then(redirectIfNoPlayer)
          .then(redirectIfMoreThanOnePlayer)
          .then(redirectIfPlayerIsNotInSave)
          .then((player) => addPlayer(save, player.id))
          .then(addDeviceToPlayer)
          .spread(notifyClientofPlayerNumber)
          .spread(notifyClientOfDeviceNumber)
          .spread(determineIfOnSameSubnet)
          .spread((player, deviceNumber) => {
            statePusher().start(save, socket, player.number, deviceNumber)
          })
          .then(() => on().playerGroupChange(getPlayers(save), save.id))
          .then(() => updateWaitingForPlayers())
          .catch((err) => {
            logger.error({deviceId, save}, err);
            socket.emit('error', err);
            return updateWaitingForPlayers();
          });
      };
    });

    function markDeviceSlotAsDead (devices, deviceId) {
      return map(devices, (device) => {
        if (device.id === deviceId) {
          return { id: dead, ip: null};
        }

        return device;
      });
    }

    define()('OnClientDisconnect', function OnClientDisconnect () {
      return function indicatePlayerAsDisconnected (state, socket, save) {
        const deviceId = socket.request.sessionID;

        function updateWaitingForPlayers () {
          return ['ensemble.waitingForPlayers', determineIfWaitingForPlayers(save)];
        }

        return playersStore.getByDevice(deviceId)
          .then(redirectIfNoPlayer)
          .then(redirectIfMoreThanOnePlayer)
          .then((player) => get(save.id, player.id))
          .then(logErrorIfNoConnectionFound)
          .then((connection) => {
            const device = connection.devices.find(({id}) => id === deviceId)

            connection.devices = markDeviceSlotAsDead(connection.devices, deviceId);

            connection.onSameSubnet = onSameSubnet(validIpAddresses(connection.devices));
            if (activeDevices(connection.devices).length === 0) {
              connection.status = 'offline';
            }

            return [connection, device]
          })
          .spread((connection, device) => {
            statePusher().stop(save, connection.number, device.number)
          })
          .then(() => on().playerGroupChange(getPlayers(save), save.id))
          .then(() => updateWaitingForPlayers())
          .catch((err) => {
            logger.error({deviceId, save}, err);
            return updateWaitingForPlayers();
          });
      };
    });

    return { connectedCount, onlineCount };
  }
};