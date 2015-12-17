'use strict';

module.exports = {
  type: 'WebServerMiddleware',
  deps: ['UUID', 'PlayerDataModel'],
  func: function (uuid, players) {
    function determinePlayerId (req, res, next) {
      var player = {
        key: req.sessionID,
        keyType: 'sessionId',
      };

      function handleGetPlayer (result) {
        if (!result) {
          player._id = uuid().gen();
          player.name = player._id;

          players().save(player, handleSavePlayer);
        } else {
          req.player = result;
          next();
        }
      }

      function handleSavePlayer (id) {
        player._id = id;
        players().get(player, handleGetPlayer);
      }

      players().get(player, handleGetPlayer);
    }

    return determinePlayerId;
  }
};