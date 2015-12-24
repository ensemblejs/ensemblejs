'use strict';

var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var saveCommon = require('../workflow/save-common');
var joinSaveJsonBuilder = require('../json-builders/join-save');

function joinSave (project, savesList) {
  return function buildJson (req) {

    function passThroughPlayerAndHostname (save) {
      var hostname = 'http://' + req.headers.host;

      return [save, req.player, hostname];
    }

    function passThroughProject (save, player) {
      return [save, player, project];
    }

    return kickstartPromiseChain(savesList.get(req.params.saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(passThroughPlayerAndHostname)
      .spread(saveCommon.redirectIfPlayerIsInSave)
      .spread(saveCommon.redirectIfSaveHasNoSpace)
      .spread(passThroughProject)
      .spread(joinSaveJsonBuilder);
  };
}

module.exports = joinSave;