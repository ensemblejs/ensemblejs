'use strict';

var uuid = require('node-uuid');
var saveCommon = require('../workflow/save-common');
var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;

function newSave (project, on, time) {

  function createNewSave (mode) {
    var newSave = {
      id: uuid.v4(),
      mode: mode
    };

    on.newSave(newSave);
    on.saveReady(newSave);

    return newSave;
  }

  return function buildJson (req) {

    function passThroughPlayerAndHostnameAndProjectAndTime (save) {
      var hostname = 'http://' + req.headers.host;

      return [save, req.player, hostname, project, time.present()];
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