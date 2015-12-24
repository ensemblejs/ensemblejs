'use strict';

var contains = require('lodash').contains;
var returnRequestError = require('./promise').returnRequestError;
var config = require('../config').get();
var saves = require('../models/saves');
var savePlayers = require('../models/save-players');
var redirectTo = require('../workflow/promise').redirectTo;
var urlBuilder = require('../url-builder');

function errorIfSaveDoesNotExist (save) {
  if (!save) {
    return returnRequestError(404, 'This game does not exist');
  }

  return save;
}

function redirectIfSinglePlayer (save, player, hostname) {
  return saves.get(save.id).then(function (game) {
    console.log(config);
    if (config.maxPlayers(game.ensemble.mode) === 1) {
      return redirectTo(urlBuilder(hostname).saves(save.id).continue());
    }

    return [save, player, hostname];
  });
}

function redirectIfPlayerIsNotInSave (save, player, hostname) {
  return savePlayers.isPlayerInSave(save.id, player._id)
    .then(function (playerIsInSave) {
      if (!playerIsInSave) {
        return redirectTo(urlBuilder(hostname).saves(save.id).join());
      }

      return [save, player, hostname];
    });
}

function redirectIfSaveHasNoSpace (save, player, hostname) {
  return savePlayers.doesSaveHaveSpaceForPlayer(save.id)
    .then(function (gameHasSpace) {
      if (!gameHasSpace) {
        return redirectTo(urlBuilder(hostname).saves(save.id).full());
      }

      return [save, player, hostname];
    });
}

function redirectIfPlayerIsInSave (save, player, hostname) {
  return savePlayers.isPlayerInSave(save.id, player._id)
    .then(function (playerIsInSave) {
      if (playerIsInSave) {
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
        return redirectTo(urlBuilder(hostname).saves(save.id).join());
      }

      return [save, player, hostname];
    });
}

function redirectToContinueGame (save, player, hostname) {
  return redirectTo(urlBuilder(hostname).saves(save.id).continue());
}

function redirectToShareGame (save, player, hostname) {
  return redirectTo(urlBuilder(hostname).saves(save.id).share());
}

function addPlayer (save, player, hostname, project, now) {
  return savePlayers.addPlayer(project.id, save.id, player._id, now)
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
  if (!contains(project.modes, mode)) {
    return returnRequestError(400, 'Invalid mode. Supported modes are: ' + project.modes.join());
  }

  return [mode, project];
}

module.exports = {
  errorIfSaveDoesNotExist: errorIfSaveDoesNotExist,
  redirectIfPlayerIsNotInSave: redirectIfPlayerIsNotInSave,
  redirectIfSinglePlayer: redirectIfSinglePlayer,
  redirectIfSaveHasNoSpace: redirectIfSaveHasNoSpace,
  redirectIfPlayerIsInSave: redirectIfPlayerIsInSave,
  errorIfSecretIsNotSupplied: errorIfSecretIsNotSupplied,
  redirectIfSecretIsIncorrect: redirectIfSecretIsIncorrect,
  redirectToContinueGame: redirectToContinueGame,
  redirectToShareGame: redirectToShareGame,
  addPlayer: addPlayer,
  errorIfModeIsMissing: errorIfModeIsMissing,
  errorIfModeIsNotValid: errorIfModeIsNotValid
};