'use strict';

import mongo from '../mongo';
import Bluebird from 'bluebird';
var logger = require('../../logging/server/logger').logger;
var collection = 'devices';

export function getById (deviceId) {
  return mongo.getById(collection, deviceId);
}

export function save (device, now) {
  if (!device) {
    logger.error({device: device, now: now}, 'Cannot save device. Nothing to save.');
    return Bluebird.reject('Cannot save device. Nothing to save.');
  }
  if (!now) {
    logger.error({device: device, now: now}, 'Cannot save device. No timestamp supplied.');
    return Bluebird.reject('Cannot save device. No timestamp supplied.');
  }

  device.updated = now;

  return mongo.store(collection, device);
}
