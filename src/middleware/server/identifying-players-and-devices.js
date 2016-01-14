'use strict';

import {getById as getDeviceById, save as saveDevice} from '../../util/models/devices';
import {logger} from '../../../src/logging/server/logger';
import {getById as getPlayerById, save as savePlayer, getByDevice as getPlayerByDevice, linkToDevice as linkPlayerToDevice}  from '../../util/models/players';
import {first} from 'lodash/array';
import {pluck} from 'lodash/collection';
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
          return saveDevice({ _id: req.sessionID }, time().present())
            .then(deviceId => getDeviceById(deviceId) );
        }

        return device;
      }

      return getDeviceById(req.sessionID)
        .then(createDeviceIfNoneFound)
        .then(device => req.device = device)
        .then(() => next());
    };
  });

  function linkPlayerAndDevice(player, deviceId) {
    return linkPlayerToDevice(player._id, deviceId)
      .then(() => [player, deviceId]);
  }

  define()('WebServerMiddleware', ['UUID'], (uuid) => {
    function createPlayerAndLinkToDevice (deviceId) {
      var id = uuid().gen();
      return savePlayer({_id: id}, time().present())
        .then(id => getPlayerById(id))
        .then(player => [player, deviceId])
        .spread(linkPlayerAndDevice)
        .spread(player => [player]);
    }

    return function determinePlayerId (req, res, next) {
      if(!req.device._id) {
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
          return createPlayerAndLinkToDevice(req.device._id);
        }

        return players;
      }

      function logErrorIfMoreThanOnePlayerAssociatedWithDevice (players) {
        if (players.length > 1) {
          logger.error(
            {
              reqId: req.id,
              device: req.device,
              players: pluck(players, '_id')
            },
            'More than one player associated with device.'
          );

          return Bluebird.reject('Too many players on the dance floor.');
        }

        return players;
      }

      return getPlayerByDevice(req.device._id)
        .then(createAndLinkToDeviceIfNoPlayers)
        .then(logErrorIfMoreThanOnePlayerAssociatedWithDevice)
        .then(players => req.player = first(players))
        .then(() => next())
        .catch(err => res.status(500).send(err));
    };
  });
}

module.exports = {
  type: 'IdentifyingPlayersAndDevices',
  deps: ['DefinePlugin', 'Time'],
  func: IdentifyingPlayersAndDevices
};