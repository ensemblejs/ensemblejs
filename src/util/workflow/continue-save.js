'use strict';

var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var saveCommon = require('../workflow/save-common');
var buildContinueSaveJson = require('../json-builders/continue-save');

import {determineDeviceMode} from '../device-mode';

function continueSave (savesList, on) {
  function loadSaveIfNotLoaded (save) {
    if (!save.loaded) {
      on.loadSave(save);
    }

    return save;
  }

  return function buildJson (req) {
    var deviceMode = determineDeviceMode(req.query.deviceMode);

    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(save => [save, req.player, `http://${req.headers.host}`])
      .spread(saveCommon.redirectIfPlayerIsNotInSave)
      .spread(loadSaveIfNotLoaded)
      .then(save => [save.mode, deviceMode])
      .spread(buildContinueSaveJson);
  };
}

module.exports = continueSave;