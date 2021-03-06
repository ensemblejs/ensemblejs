'use strict';

var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var saveCommon = require('../workflow/save-common');
var joinSaveJsonBuilder = require('../json-builders/join-save');
import {hostname} from '../../util/hostname';
import {isAutoAdd} from '../models/saves';

function joinSave (project, savesList) {
  return function buildJson (req) {

    function passThroughPlayerAndHostname (save) {
      return [save, req.player, hostname()];
    }

    function passThroughProject (save, player) {
      return [save, player, hostname(), project];
    }

    function addFlashMessages (json) {
      json.info = req.flash('info');
      json.warning = req.flash('warning');
      json.error = req.flash('error');

      return json;
    }

    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(passThroughPlayerAndHostname)
      .spread(saveCommon.redirectIfPlayerIsInSave)
      .spread(saveCommon.redirectIfSaveHasNoSpace)
      .spread(function addPlayerIfAutoAdd(save, player, hostname) {
        return isAutoAdd(save.id).then(weShouldAddPlayer => {
          if (weShouldAddPlayer) {
            return saveCommon.addPlayer(save, player, hostname, project)
              .spread(saveCommon.redirectToContinueSave);
          } else {
            return [save, player, hostname];
          }
        });
      })
      .spread(passThroughProject)
      .spread(joinSaveJsonBuilder)
      .then(addFlashMessages);
  };
}

module.exports = joinSave;