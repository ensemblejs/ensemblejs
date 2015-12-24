'use strict';

var isEqual = require('lodash').isEqual;
var logger = require('../../logging/server/logger').logger;
var mongo = require('../mongo').setup(logger);
var summaryFromSaveState = require('../adapter').summaryFromSaveState;

var collection = 'saves';

function all () {
  return mongo.getAll(collection, summaryFromSaveState);
}

function get (saveId) {
  return mongo.getById(collection, saveId);
}

function save (data, now) {
  if (!data) {
    logger.error('Can\'t persist save. No data supplied');
    return;
  }
  if (!now) {
    logger.error('Can\'t persist save. No timestamp supplied');
    return;
  }

  data._id = data._id || data.ensemble.saveId;
  data.updated = now;

  return mongo.store(collection, data);
}

function determineIfGameIsPublic(save) {
  return isEqual(save.ensemble.secret, 'public');
}

function isSavePublic (saveId) {
  return get(saveId).then(determineIfGameIsPublic);
}

function isSecretCorrect (saveId, suppliedSecret) {
  return get(saveId)
    .then(function determineIfSecretIsCorrect(save) {
      var a = save.ensemble.secret.toLowerCase();
      var b = suppliedSecret.toLowerCase();

      return isEqual(a, b);
    });
}

module.exports = {
  all: all,
  get: get,
  save: save,
  isSecretCorrect: isSecretCorrect,
  isSavePublic: isSavePublic
};