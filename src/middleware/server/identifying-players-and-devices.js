'use strict';

import {getById, save} from '../../util/models/devices';
import {logger} from '../../../src/logging/server/logger';

function IdentifyingPlayersAndDevices (define, time) {
  define()('WebServiceMiddleware', () => {
    return function determineDeviceId (req, res, next) {

      function handleGetDevice (device) {
        function handleSaveDevice (id) {
          getById(id).then(handleGetDevice);
        }

        if (!device) {
          var newDevice = {
            _id: req.sessionID
          };

          save(newDevice, time().present()).then(handleSaveDevice);
        } else {
          req.device = device;
          next();
        }
      }

      if(!req.sessionID) {
        logger.error({reqId: req.id}, 'Unable to determine device id');
        res.status(500).send('Unable to determine device id');
      }

      getById(req.sessionID).then(handleGetDevice);
    };
  });

  define()('WebServiceMiddleware', () => {
    return function determinePlayerId (req, res, next) {
      next();
    };
  });
}

module.exports = {
  type: 'IdentifyingPlayersAndDevices',
  deps: ['DefinePlugin', 'Time'],
  func: IdentifyingPlayersAndDevices
};