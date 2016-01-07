'use strict';

var isEqual = require('lodash').isEqual;
var logger = require('../../logging/server/logger').logger;
var mongo = require('../mongo');
var summarise = require('../adapters/save-adapter').summarise;

var collection = 'saves';

function getByGame (gameId) {
  var filter = { 'ensemble.gameId': gameId };
  return mongo.getAllByFilter(collection, filter, summarise);
}

function getById (saveId) {
  return mongo.getById(collection, saveId);
}

function save (data, now) {
  if (!data) {
    logger.error({data: data, now: now}, 'Can\'t persist save. No data supplied');
    return;
  }
  if (!now) {
    logger.error({data: data, now: now}, 'Can\'t persist save. No timestamp supplied');
    return;
  }

  data._id = data._id || data.ensemble.saveId;
  data.updated = now;

  return mongo.store(collection, data);
}

function determineIfSaveIsPublic(save) {
  return isEqual(save.ensemble.secret, 'public');
}

function isPublic (saveId) {
  return getById(saveId).then(determineIfSaveIsPublic);
}

function isSecretCorrect (saveId, suppliedSecret) {
  function determineIfSecretIsCorrect(save) {
    var a = save.ensemble.secret.toLowerCase();
    var b = suppliedSecret.toLowerCase();

    return isEqual(a, b);
  }

  return getById(saveId)
    .then(determineIfSecretIsCorrect);
}

module.exports = {
  getByGame: getByGame,
  getById: getById,
  save: save,
  isSecretCorrect: isSecretCorrect,
  isPublic: isPublic
};