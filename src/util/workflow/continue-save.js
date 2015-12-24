'use strict';

var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var saveCommon = require('../workflow/save-common');
var buildContinueSaveJson = require('../json-builders/continue-save');

function continueSave (savesList, on) {
  function loadSaveIfNotLoaded (save) {
    if (!save.loaded) {
      on.loadGame(save);
    }

    return save;
  }

  return function buildJson (req) {

    function passThroughPlayerAndHostname (save) {
      var hostname = 'http://' + req.headers.host;

      return [save, req.player, hostname];
    }

    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(passThroughPlayerAndHostname)
      .spread(saveCommon.redirectIfPlayerIsNotInSave)
      .spread(loadSaveIfNotLoaded)
      .then(buildContinueSaveJson);
  };
}

module.exports = continueSave;