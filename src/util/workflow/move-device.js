'use strict';

var players = require('../../util/models/players');
var redirectTo = require('../../util/workflow/promise').redirectTo;

var returnRequestError = require('../../util/workflow/promise').returnRequestError;

function errorIfPlayerDoesNotExist (player) {
  if (!player) {
    return returnRequestError(400, 'The player does not exist');
  }

  return player;
}

export function moveDevice () {
  return function moveDeviceBetweenPlayers (req) {

    let fromPlayer = req.player.id;
    let toPlayer = req.query.toPlayer;
    let deviceId = req.device.id;

    if (!toPlayer) {
      return returnRequestError(400, 'toPlayer not supplied');
    }

    return players.getById(fromPlayer).then(errorIfPlayerDoesNotExist)
      .then(() => players.getById(toPlayer)).then(errorIfPlayerDoesNotExist)
      .then(() => players.unlinkDevice(fromPlayer, deviceId))
      .then(() => players.linkToDevice(toPlayer, deviceId))
      .then(() => redirectTo('back'));
  };
}
