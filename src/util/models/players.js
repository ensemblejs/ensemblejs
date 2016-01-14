'use strict';

import {logger} from '../../logging/server/logger';
import mongo from '../mongo';
import Bluebird from 'bluebird';

const collection = 'players';
const playersAndDevices = 'player_devices';

export function getById (playerId) {
  return mongo.getById(collection, playerId);
}

function mapPlayerDeviceToPlayers (playerDevice) {
  return getById(playerDevice.playerId);
}

export function getByDevice (deviceId) {
  return mongo.getAllByFilter(playersAndDevices, {deviceId: deviceId}, mapPlayerDeviceToPlayers)
  .then(promises => {
    return Bluebird.all(promises);
  });
}
export function linkToDevice(playerId, deviceId) {
  return mongo.store(playersAndDevices, {playerId : playerId, deviceId: deviceId});
}

export function getByKey (key, keyType) {
  var filter = { key: key, keyType: keyType};

  return mongo.getOneByFilter(collection, filter);
}

export function save (player, now) {
  if (!player) {
    logger.error({player: player, now: now}, 'Cannot save player. Nothing to save.');
    return Bluebird.reject('Cannot save player. Nothing to save.');
  }
  if (!now) {
    logger.error({player: player, now: now}, 'Cannot save player. No timestamp supplied.');
    return Bluebird.reject('Cannot save player. No timestamp supplied.');
  }

  player.updated = now;

  return mongo.store(collection, player);
}

export default  {
  getById: getById,
  getByKey: getByKey,
  save: save
};