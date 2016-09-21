'use strict';

import {getById as getDeviceById, save as saveDevice} from '../../util/models/devices';
import {logger} from '../../logging/server/logger';
import {getById as getPlayerById, save as savePlayer, getByDevice as getPlayerByDevice, getAll}  from '../../util/models/players';
import {first, map} from 'lodash';
import Bluebird from 'bluebird';

function IdentifyingPlayersAndDevices (define, time) {
  define()('WebServerMiddleware', () => {
    return function determineDeviceId (req, res, next) {
      if(!req.sessionID) {
        logger.error({reqId: req.id}, 'Session not found on request.');
        res.status(500).send('Unable to determine device id');
        return;
      }

      function createDeviceIfNoneFound(device) {
        if (!device) {
          return saveDevice({ id: req.sessionID }, time().present())
            .then((res2) => getDeviceById(res2.id));
        }

        return device;
      }

      return getDeviceById(req.sessionID)
        .then(createDeviceIfNoneFound)
        .then((device) => {
          logger.info(`Connection identified with device: ${device.id}`);
          req.device = device;
        })
        .then(() => next());
    };
  });

  define()('WebServerMiddleware', ['UUID', 'Config'], (uuid, config) => {
    function createPlayerAndLinkToDevice (deviceId) {
      return savePlayer({id: uuid().gen(), deviceIds: [deviceId]}, time().present())
        .then((res) => getPlayerById(res.id))
        .then((player) => [player]);
    }

    function linkPlayerToExistingDevice (playerId, deviceId) {
      return savePlayer({id: playerId, deviceIds: [deviceId]}, time().present())
        .then((res) => getPlayerById(res.id))
        .then((player) => [player]);
    }

    return function determinePlayerId (req, res, next) {
      if(!req.device.id) {
        logger.error(
          {
            reqId: req.id,
            device: req.device
          },
          'No device on request'
        );

        res.status(500).send('Unable to determine player id');
        return;
      }

      function createAndLinkToDeviceIfNoPlayers (players) {
        if (players.length === 0) {
          return createPlayerAndLinkToDevice(req.device.id);
        }

        return players;
      }

      function logErrorIfMoreThanOnePlayerAssociatedWithDevice (players) {
        if (players.length > 1) {
          logger.error(
            {
              reqId: req.id,
              device: req.device,
              players: map(players, 'id')
            },
            'More than one player associated with device.'
          );

          return Bluebird.reject('Too many players on the dance floor.');
        }

        return players;
      }

      if (config().debug.everybodyIsPlayerOne) {
        return getAll().then((players) => {
          if (players.length === 0) {
            return createPlayerAndLinkToDevice(req.device.id);
          }

          return linkPlayerToExistingDevice(players[0].id, req.device.id);
        })
        .then((players) => {
          logger.info(`Connection identified as player: ${first(players).id}`);
          req.player = first(players);
        })
        .then(() => next())
        .catch((err) => res.status(500).send(err));
      }

      return getPlayerByDevice(req.device.id)
        .then(createAndLinkToDeviceIfNoPlayers)
        .then(logErrorIfMoreThanOnePlayerAssociatedWithDevice)
        .then((players) => {
          logger.info(`Connection identified as player: ${first(players).id}`);
          req.player = first(players);
        })
        .then(() => next())
        .catch((err) => res.status(500).send(err));
    };
  });
}

module.exports = {
  type: 'IdentifyingPlayersAndDevices',
  deps: ['DefinePlugin', 'Time'],
  func: IdentifyingPlayersAndDevices
};