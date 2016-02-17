'use strict';

var config = require('../../util/config');
var post = require('../../util/request-handling').post;
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
      app.post('/device/move', post(moveDevice()));
    }

    return {
      configure: configure
    };
  }
};