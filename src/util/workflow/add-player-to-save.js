'use strict';

var Bluebird = require('bluebird');
var saves = require('../models/saves');
var saveCommon = require('../workflow/save-common');
var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;

function addPlayerToSave (project, savesList, time) {
  return function buildJson (req) {

    function passThroughPlayerAndHostname (save) {
      var hostname = 'http://' + req.headers.host;

      return [save, req.player, hostname];
    }

    function passThroughSecret (save, player, hostname) {
      return [save, player, hostname, req.body.secret];
    }

    function passThroughProjectAndTime (save, player, hostname) {
      return [save, player, hostname, project, time];
    }

    function stopPassingSecretThrough (save, player, hostname) {
      return [save, player, hostname];
    }

    function stopPassingProjectAndTimeThrough (save, player, hostname) {
      return [save, player, hostname];
    }

    function restartPromiseChain (save, player, hostname) {
      return new Bluebird(function (resolve) {
        resolve([save, player, hostname]);
      });
    }

    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(passThroughPlayerAndHostname)
      .spread(saveCommon.redirectIfPlayerIsInSave)
      .spread(saveCommon.redirectIfSaveHasNoSpace)
      .spread(passThroughProjectAndTime)
      .spread(function withPublicGames (save, player, hostname, project, time) {
        return saves.isSavePublic(save.id)
          .then(function addPlayerIsSaveIsPublic(saveIsPublic) {
            if (saveIsPublic) {
              return saveCommon.addPlayer(save, player, hostname, project, time.present())
                .spread(saveCommon.redirectToContinueGame);
            } else {
              return [save, player, hostname, project];
            }
          });
      })
      .spread(stopPassingProjectAndTimeThrough)
      .spread(function withPrivateGames (save, player, hostname) {
        return restartPromiseChain(save, player, hostname)
          .spread(passThroughSecret)
          .spread(saveCommon.errorIfSecretIsNotSupplied)
          .spread(saveCommon.redirectIfSecretIsIncorrect)
          .spread(stopPassingSecretThrough)
          .spread(passThroughProjectAndTime)
          .spread(saveCommon.addPlayer)
          .spread(saveCommon.redirectToContinueGame);
      });
  };
}

module.exports = addPlayerToSave;