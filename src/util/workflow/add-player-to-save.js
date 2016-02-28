'use strict';

var Bluebird = require('bluebird');
var saves = require('../models/saves');
var saveCommon = require('../workflow/save-common');
var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
import {hostname} from '../../util/hostname';

function addPlayerToSave (project, savesList, time) {
  return function buildJson (req) {

    function passThroughPlayerAndHostname (save) {
      return [save, req.player, hostname()];
    }

    function passThroughSecret (save, player) {
      return [save, player, hostname(), req.body.secret];
    }

    function passThroughProjectAndTime (save, player) {
      return [save, player, hostname(), project, time];
    }

    function stopPassingSecretThrough (save, player) {
      return [save, player, hostname()];
    }

    function stopPassingProjectAndTimeThrough (save, player) {
      return [save, player, hostname()];
    }

    function restartPromiseChain (save, player) {
      return new Bluebird(function (resolve) {
        resolve([save, player, hostname()]);
      });
    }

    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(passThroughPlayerAndHostname)
      .spread(saveCommon.redirectIfPlayerIsInSave)
      .spread(saveCommon.redirectIfSaveHasNoSpace)
      .spread(passThroughProjectAndTime)
      .spread(function withPublicSaves (save, player, host, project, time) {
        return saves.isPublic(save.id)
          .then(function addPlayerIsSaveIsPublic(saveIsPublic) {
            if (saveIsPublic) {
              return saveCommon.addPlayer(save, player, host, project, time.present())
                .spread(saveCommon.redirectToContinueSave);
            } else {
              return [save, player, host, project];
            }
          });
      })
      .spread(stopPassingProjectAndTimeThrough)
      .spread(function withPrivateSaves (save, player) {
        return restartPromiseChain(save, player)
          .spread(passThroughSecret)
          .spread(saveCommon.errorIfSecretIsNotSupplied)
          .spread(saveCommon.redirectIfSecretIsIncorrect)
          .spread(stopPassingSecretThrough)
          .spread(passThroughProjectAndTime)
          .spread(saveCommon.addPlayer)
          .spread(saveCommon.redirectToContinueSave);
      });
  };
}

module.exports = addPlayerToSave;