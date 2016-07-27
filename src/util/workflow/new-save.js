'use strict';

var uuid = require('node-uuid');
var saveCommon = require('../workflow/save-common');
var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
import {hostname} from '../../util/hostname';

function newSave (project, on, time) {

  function createNewSave (mode) {
    var save = {
      id: uuid.v4(),
      mode: mode
    };

    on.newSave(save);

    return on.saveReady(save).then(() => save);
  }

  return function buildJson (req) {

    function passThroughPlayerAndHostnameAndProjectAndTime (save) {
      return [save, req.player, hostname(), project, time.present()];
    }

    function passThroughProject (mode) {
      return [mode, project];
    }

    return kickstartPromiseChain(req.body.mode)
      .then(saveCommon.errorIfModeIsMissing)
      .then(passThroughProject)
      .spread(saveCommon.errorIfModeIsNotValid)
      .spread(createNewSave)
      .then(passThroughPlayerAndHostnameAndProjectAndTime)
      .spread(saveCommon.addPlayer)
      .spread(saveCommon.redirectToShareSave);
  };
}

module.exports = newSave;