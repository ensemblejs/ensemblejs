'use strict';

import {logger} from '../../logging/server/logger';
import {get, view, store} from '../database';
import Bluebird from 'bluebird';
import {map, remove} from 'lodash';

const collection = 'players';

export function getAll () {
  return view(collection, 'all').then((set) => map(set, 'value'));
}

export function getById (playerId) {
  return get(collection, playerId);
}

export function getByDevice (deviceId) {
  return view(collection, 'byDevice', {
    key: deviceId
  }).then(set => map(set, 'value'));
}

export function linkToDevice(playerId, deviceId) {
  return getById(playerId)
    .then(player => {
      player.deviceIds.push(deviceId);
      return store(collection, player);
    });
}

export function unlinkDevice (playerId, deviceId) {
  return getById(playerId)
    .then(player => {
      player.deviceIds = remove(player.deviceIds, deviceId);
      return store(collection, player);
    });
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

  return store(collection, player);
}