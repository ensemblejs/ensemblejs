'use strict';

var logger = require('../../logging/server/logger').logger;
var config = require('../config');
import {get, view, store} from '../database';
import {raw} from '../adapters/save-adapter';
import {map, isEqual, uniq, includes} from 'lodash';
import moment from 'moment';

var collection = 'saves';
var metadataCollection = 'saves_metadata';

export function getByGame (gameId, adapter = raw) {
  return view(collection, 'byGame', {
    key: gameId
  }).then(set => map(set, 'value')).then(set => map(set, adapter));
}

export function getByGameAndPlayer (gameId, playerId, adapter = raw) {
  return view(metadataCollection, 'byGameAndPlayer', {
    key: [gameId, playerId]
  }).then(set => map(set, 'value')).then(set => map(set, adapter));
}

export function getById (saveId) {
  return get(collection, saveId);
}

export function save (data) {
  if (!data) {
    logger.error({data: data}, 'Can\'t persist save. No data supplied');
    return;
  }

  data.id = data.id || data.ensemble.saveId;
  data.updated = moment().unix();

  return store(collection, data)
    .then(() => get(metadataCollection, data.id))
    .then(saveMetadata => {
      if (!saveMetadata) {
        return store(metadataCollection, {
          id: data.id,
          mode: data.ensemble.mode,
          playerIds: [],
          secret: data.ensemble.secret,
          updated: moment().unix()
        });
      }
    });
}

export function determineIfSaveIsPublic(save) {
  return isEqual(save.ensemble.secret, 'public-ask') || isEqual(save.ensemble.secret, 'public-auto');
}

export function determineIfSaveIsAutoAdd(save) {
  return isEqual(save.ensemble.secret, 'public-auto');
}

export function isPublic (saveId) {
  return getById(saveId).then(determineIfSaveIsPublic);
}

export function isAutoAdd (saveId) {
  return getById(saveId).then(determineIfSaveIsAutoAdd);
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
  return get(metadataCollection, saveId)
    .then(save => includes(save.playerIds, playerId));
}

export function addPlayer (saveId, playerId) {
  if (!saveId) {
    logger.error('Can\'t add player. No saveId supplied');
    return;
  }
  if (!playerId) {
    logger.error('Can\'t add player. No playerId supplied');
    return;
  }

  return get(metadataCollection, saveId)
    .then(function addPlayerToSave (save) {
      if (!save) {
        logger.error({saveId: saveId}, 'Attempted to add player to save before save exists');
      }

      save.playerIds = uniq(save.playerIds.concat(playerId));
      save.updated = moment().unix();

      return store(metadataCollection, save);
    });
}

export function hasSpaceForPlayer (saveId) {
  return get(metadataCollection, saveId)
    .then(save => save.playerIds.length < config.get().maxPlayers(save.mode));
}

export function canPlayerJoin (saveId) {
  return get(metadataCollection, saveId)
    .then(save => save.secret === 'public'? hasSpaceForPlayer(saveId) : false);
}