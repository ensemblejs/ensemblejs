'use strict';

var config = require('../../util/config').get();
var saves = require('../../util/models/saves');

module.exports = {
  type: 'Routes',
  func: function DebugRoutes () {

    function dumpSaveData (req, res) {
      var saveId = req.params.saveId;
      if (!saveId) {
        return res.status(400).send('Missing saveId');
      }

      function handleGame (game) {
        if (!game) {
          return res.status(404).send('This save game does not exist');
        }

        return res.json(game);
      }

      saves.get(saveId)
        .then(handleGame);
    }

    function configure (app) {
      if (!config.debug.develop) {
        return;
      }

      app.get('/saves/:saveId/data', dumpSaveData);
    }

    return {
      configure: configure
    };
  }
};