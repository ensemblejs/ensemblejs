'use strict';

var config = require('../../util/config');

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
    }

    return {
      configure: configure
    };
  }
};