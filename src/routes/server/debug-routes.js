'use strict';

var config = require('../../util/config');
var saves = require('../../util/models/saves');
var saveCommon = require('../../util/workflow/save-common');

module.exports = {
  type: 'Routes',
  func: function DebugRoutes () {

    function dumpSaveData (req, res) {
      return saves.getById(req.params.saveId)
        .then(saveCommon.errorIfSaveDoesNotExist)
        .then(function returnDataAsJson (save) {
          res.json(save);
        });
    }

    function configure (app) {
      if (!config.get().debug.develop) {
        return;
      }

      app.get('/saves/:saveId/data', dumpSaveData);
    }

    return {
      configure: configure
    };
  }
};