'use strict';

var logger = require('../../logging/server/logger').logger;
var config = require('../config');
import {get, view, store} from '../database';
import {raw} from '../adapters/save-adapter';
import {map, isEqual} from 'lodash';

var collection = 'saves';
var metadata_collection = 'saves_metadata';

export function getByGame (gameId, adapter = raw) {
  return view(collection, 'byGame', {
    key: gameId
  }).then(set => map(set, 'value')).then(set => map(set, adapter));
}

export function getByGameAndPlayer (gameId, playerId, adapter = raw) {
  return view(metadata_collection, 'byGameAndPlayer', {
    key: [gameId, playerId]
  }).then(set => map(set, 'value')).then(set => map(set, adapter));
}

export function getById (saveId) {
  return get(collection, saveId);
}

export function save (data, now) {
  if (!data) {
    logger.error({data: data, now: now}, 'Can\'t persist save. No data supplied');
    return;
  }
  if (!now) {
    logger.error({data: data, now: now}, 'Can\'t persist save. No timestamp supplied');
    return;
  }

  const secret = data.ensemble.secret;
  delete data.ensemble.secret;
  data.id = data.id || data.ensemble.saveId;
  data.updated = now;

  return store(collection, data)
    .then(() => store(metadata_collection, {
      id: data.id,
      mode: data.ensemble.mode,
      playerIds: [],
      secret: secret,
      updated: now
    }));
}

export function determineIfSaveIsPublic(save) {
  return isEqual(save.ensemble.secret, 'public');
}

export function isPublic (saveId) {
  return getById(saveId).then(determineIfSaveIsPublic);
}

export function isSecretCorrect (saveId, suppliedSecret) {
  function determineIfSecretIsCorrect(save) {
    var a = save.ensemble.secret.toLowerCase();
    var b = suppliedSecret.toLowerCase();

    return isEqual(a, b);
  }

  return getById(saveId).then(determineIfSecretIsCorrect);
}

export function isPlayerInSave (saveId, playerId) {
  return view(metadata_collection, 'byPlayer', {
    key: [saveId, playerId]
  }).then(set => set.length > 0);
}

export function addPlayer (saveId, playerId, now) {
  if (!saveId) {
    logger.error('Can\'t add player. No saveId supplied');
    return;
  }
  if (!playerId) {
    logger.error('Can\'t add player. No playerId supplied');
    return;
  }
  if (!now) {
    logger.error('Can\'t add player. No timestamp supplied');
    return;
  }

  return get(metadata_collection, saveId)
    .then(save => {
      save.playerIds.push(playerId);
      save.updated = now;

      return store(metadata_collection, save);
    })
    .catch(() => {
      let save = {
        id: saveId,
        playerIds: [playerId],
        updated: now
      };

      return store(metadata_collection, save);
    });
}

export function hasSpaceForPlayer (saveId) {
  return get(metadata_collection, saveId)
    .then(save => save.playerIds.length < config.get().maxPlayers(save.mode));
}

export function canPlayerJoin (saveId) {
  return get(metadata_collection, saveId)
    .then(save => save.secret === 'public'? hasSpaceForPlayer(saveId) : false);
}