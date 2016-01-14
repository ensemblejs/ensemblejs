'use strict';

import {getById as getDeviceById, save as saveDevice} from '../../util/models/devices';
import {logger} from '../../../src/logging/server/logger';
import {getById as getPlayerById, save as savePlayer, getByDevice as getPlayerByDevice, linkToDevice as linkPlayerToDevice}  from '../../util/models/players';
import {first} from 'lodash/array';
import {pluck} from 'lodash/collection';
import Bluebird from 'bluebird';

function IdentifyingPlayersAndDevices (define, time) {
  define()('WebServiceMiddleware', () => {
    return function determineDeviceId (req, res, next) {

      if(!req.sessionID) {
        logger.error({reqId: req.id}, 'Session not found on request.');
        res.status(500).send('Unable to determine device id');
        return;
      }

      function handleGetDevice (device) {
        function handleSaveDevice (id) {
          getDeviceById(id).then(handleGetDevice);
        }

        if (!device) {
          var newDevice = {
            _id: req.sessionID
          };

          saveDevice(newDevice, time().present()).then(handleSaveDevice);
        } else {
          req.device = device;
          next();
        }
      }

      getDeviceById(req.sessionID).then(handleGetDevice);
    };
  });

  function linkPlayerAndDevice(player, deviceId) {
    return linkPlayerToDevice(player._id, deviceId)
      .then(() => [player, deviceId]);
  }

  define()('WebServiceMiddleware', ['UUID'], (uuid) => {
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

      return getPlayerByDevice(req.device._id)
        .then(function handleNoPlayers (players) {
          if (players.length === 0) {
            return createPlayerAndLinkToDevice(req.device._id);
          }

          return players;
        })
        .then(function handleMultiplePlayers (players) {
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
        })
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