'use strict';

var includes = require('lodash').includes;
var returnRequestError = require('./promise').returnRequestError;
var config = require('../config');
var saves = require('../models/saves');
var redirectTo = require('../workflow/promise').redirectTo;
var urlBuilder = require('../url-builder');
var logger = require('../../logging/server/logger').logger;

function errorIfSaveDoesNotExist (save) {
  if (!save) {
    return returnRequestError(404, 'This save does not exist');
  }

  return save;
}

function redirectIfSinglePlayer (save, player, hostname) {
  return saves.getById(save.id).then(function (saveRecord) {
    if (config.get().maxPlayers(saveRecord.ensemble.mode) === 1) {
      logger.info('Continuing save because single player.');
      return redirectTo(urlBuilder(hostname).saves(save.id).continue());
    }

    return [save, player, hostname];
  });
}

function redirectIfPlayerIsNotInSave (save, player, hostname) {
  return saves.isPlayerInSave(save.id, player.id)
    .then(function (playerIsInSave) {
      if (!playerIsInSave) {
        logger.info('Player not in save. Must join.');
        return redirectTo(urlBuilder(hostname).saves(save.id).join(), 'Player not in save. Must join.');
      }

      return [save, player, hostname];
    });
}

function redirectIfSaveHasNoSpace (save, player, hostname) {
  return saves.hasSpaceForPlayer(save.id)
    .then(function (saveHasSpace) {
      if (!saveHasSpace) {
        logger.info('Save is full.');
        return redirectTo(urlBuilder(hostname).saves(save.id).full());
      }

      return [save, player, hostname];
    });
}

function redirectIfPlayerIsInSave (save, player, hostname) {
  return saves.isPlayerInSave(save.id, player.id)
    .then(function (playerIsInSave) {
      if (playerIsInSave) {
        logger.info('Player is in save. Continuing.');
        return redirectTo(urlBuilder(hostname).saves(save.id).continue());
      }

      return [save, player, hostname];
    });
}

function errorIfSecretIsNotSupplied (save, player, hostname, secret) {
  if (!secret) {
    return returnRequestError(400, 'Missing secret');
  }

  return [save, player, hostname, secret];
}

function redirectIfSecretIsIncorrect (save, player, hostname, secret) {
  return saves.isSecretCorrect(save.id, secret)
    .then(function (secretIsCorrect) {
      if (!secretIsCorrect) {
        logger.info('Secret is incorrect.');
        return redirectTo(urlBuilder(hostname).saves(save.id).join(), 'Secret is incorrect.');
      }

      return [save, player, hostname];
    });
}

function redirectToContinueSave (save, player, hostname) {
  return redirectTo(urlBuilder(hostname).saves(save.id).continue());
}

function redirectToShareSave (save, player, hostname) {
  return redirectTo(urlBuilder(hostname).saves(save.id).share());
}

function addPlayer (save, player, hostname, project) {
  return saves.addPlayer(save.id, player.id)
    .then(function discardReturnValueAndPassThroughParams() {
      return [save, player, hostname, project];
    });
}

function errorIfModeIsMissing(mode) {
  if (!mode) {
    return returnRequestError(400, 'Missing mode');
  }

  return mode;
}

function errorIfModeIsNotValid (mode, project) {
  if (!includes(project.modes, mode)) {
    return returnRequestError(400, 'Invalid mode. Supported modes are: ' + project.modes.join());
  }

  return [mode, project];
}

module.exports = {
  errorIfSaveDoesNotExist,
  redirectIfPlayerIsNotInSave,
  redirectIfSinglePlayer,
  redirectIfSaveHasNoSpace,
  redirectIfPlayerIsInSave,
  errorIfSecretIsNotSupplied,
  redirectIfSecretIsIncorrect,
  redirectToContinueSave,
  redirectToShareSave,
  addPlayer,
  errorIfModeIsMissing,
  errorIfModeIsNotValid
};