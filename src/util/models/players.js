'use strict';

var logger = require('../../logging/server/logger').logger;
var mongo = require('../mongo');
var Bluebird = require('bluebird');
var collection = 'players';

function getById (playerId) {
  return mongo.getById(collection, playerId);
}

function getByKey (key, keyType) {
  var filter = { key: key, keyType: keyType};

  return mongo.getOneByFilter(collection, filter);
}

function save (player, now) {
  if (!player) {
    logger.error({player: player, now: now}, 'Cannot save player. Nothing to save.');
    return Bluebird.reject();
  }
  if (!now) {
    logger.error({player: player, now: now}, 'Cannot save player. No timestamp supplied.');
    return Bluebird.reject();
  }

  player.updated = now;

  return mongo.store(collection, player);
}

module.exports = {
  getById: getById,
  getByKey: getByKey,
  save: save
};