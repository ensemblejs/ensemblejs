'use strict';

var logger = require('../../logging/server/logger').logger;
var config = require('../config').get(logger);
var mongo = require('../mongo').setup(logger);
var uuid = require('node-uuid');
var saves = require('./saves');

function determineExistence (record) {
  return record !== null;
}

var collection = 'save_game_players';

function getPlayers (saveId) {
  var filter = { saveId: saveId };

  return mongo.getAllByFilter(collection, filter, undefined);
}

function isPlayerInSave (saveId, playerId) {
  var filter = { saveId: saveId, playerId: playerId };

  return mongo.getOneByFilter(collection, filter)
      .then(determineExistence);
}

function addPlayer (gameId, saveId, playerId, now) {
  var record = {
    _id: uuid.v4(),
    gameId: gameId,
    saveId: saveId,
    playerId: playerId,
    updated: now
  };

  return mongo.store(collection, record);
}

function getSavesForGameAndPlayer (gameId, playerId) {
  var filter = { gameId: gameId, playerId: playerId };

  return mongo.getAllByFilter(collection, filter, undefined);
}

function doesSaveHaveSpaceForPlayer (saveId) {
  saves.get(saveId)
    .then(function getPlayersInSave (save) {
      return getPlayers(saveId)
        .then(function determineIfSaveHasSpace (players) {
          return (players.length < config.maxPlayers(save.ensemble.mode));
        });
    });
}

function canPlayerJoinSave (saveId) {
  return saves.get(saveId)
    .then(function playerCanJoinIfGameIsPublicOrItHasSpace (save) {
      if (save.ensemble.secret !== 'public') {
        return false;
      }

      return doesSaveHaveSpaceForPlayer(saveId);
    });
}

module.exports = {
  getPlayers: getPlayers,
  isPlayerInSave: isPlayerInSave,
  addPlayer: addPlayer,
  getSavesForGameAndPlayer: getSavesForGameAndPlayer,
  canPlayerJoinSave: canPlayerJoinSave,
  doesSaveHaveSpaceForPlayer: doesSaveHaveSpaceForPlayer
};