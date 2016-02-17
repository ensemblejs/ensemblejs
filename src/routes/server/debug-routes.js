'use strict';

var config = require('../../util/config');
var get = require('../../util/request-handling').get;
var moveDevice = require('../../util/workflow/move-device').moveDevice;

module.exports = {
  type: 'Routes',
  deps: ['RawStateAccess'],
  func: function DebugRoutes (raw) {

    function dumpSaveData (req, res) {
      res.json(raw().for(req.params.saveId));
    }

    function configure (app) {
      if (!config.get().debug.develop) {
        return;
      }

      app.get('/saves/:saveId/data', dumpSaveData);
      app.get('/device/move', get(moveDevice()));
    }

    return {
      configure: configure
    };
  }
};