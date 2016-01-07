'use strict';

var players = require('../../util/models/players');

module.exports = {
  type: 'WebServerMiddleware',
  deps: ['UUID', 'Time'],
  func: function (uuid, time) {
    return function determinePlayerId (req, res, next) {

      function handleGetPlayer (player) {
        function handleSavePlayer (id) {
          players.getById(id).then(handleGetPlayer);
        }

        if (!player) {
          var id = uuid().gen();
          var newPlayer = {
            _id: id,
            name: id,
            key: req.sessionID,
            keyType: 'sessionId'
          };

          players.save(newPlayer, time().present()).then(handleSavePlayer);
        } else {
          req.player = player;
          next();
        }
      }

      players.getByKey(req.sessionID, 'sessionId').then(handleGetPlayer);
    };
  }
};