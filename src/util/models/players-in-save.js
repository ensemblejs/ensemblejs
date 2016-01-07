'use strict';

var config = require('../config');
var mongo = require('../mongo');
var uuid = require('node-uuid');
var logger = require('../../logging/server/logger').logger;
var saves = require('./saves');

function determineExistence (record) {
  return record !== null;
}

var collection = 'players_in_save';

function getBySave (saveId) {
  var filter = { saveId: saveId };

  return mongo.getAllByFilter(collection, filter, undefined);
}

function getByGameAndPlayer (gameId, playerId) {
  var filter = { gameId: gameId, playerId: playerId };

  return mongo.getAllByFilter(collection, filter, undefined);
}

function isPlayerInSave (saveId, playerId) {
  var filter = { saveId: saveId, playerId: playerId };

  return mongo.getOneByFilter(collection, filter)
      .then(determineExistence);
}

function addPlayer (gameId, saveId, playerId, now) {
  if (!gameId) {
    logger.error('Can\'t add player. No gameId supplied');
    return;
  }
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

  var record = {
    _id: uuid.v4(),
    gameId: gameId,
    saveId: saveId,
    playerId: playerId,
    updated: now
  };

  return mongo.store(collection, record);
}

function hasSpaceForPlayer (saveId) {
  return saves.getById(saveId)
    .then(function getPlayersInSave (save) {
      return getBySave(saveId)
        .then(function determineIfSaveHasSpace (players) {
          return (players.length < config.get().maxPlayers(save.ensemble.mode));
        });
    });
}

function canPlayerJoin (saveId) {
  return saves.getById(saveId)
    .then(function playerCanJoinIfSaveIsPublicOrItHasSpace (save) {
      if (save.ensemble.secret !== 'public') {
        return false;
      }

      return hasSpaceForPlayer(saveId);
    });
}

module.exports = {
  getBySave: getBySave,
  getByGameAndPlayer: getByGameAndPlayer,
  isPlayerInSave: isPlayerInSave,
  addPlayer: addPlayer,
  canPlayerJoin: canPlayerJoin,
  hasSpaceForPlayer: hasSpaceForPlayer
};