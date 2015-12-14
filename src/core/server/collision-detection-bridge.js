'use strict';

var forEachMode = require('../../util/modes').forEachMode;

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetection (define, maps, collisionDetectionSystem) {

    function OnPhysicsFrame () {
      return function callSystemWithRelevantMapsAndGameId (state, delta) {
        var changes = [];

        var gameId = state.get('ensemble.gameId');
        var mode = state.get('ensemble.mode');

        function onCollision (callback) {
          changes.push(callback(state, delta));
        }

        forEachMode(maps(), mode, function (map) {
          collisionDetectionSystem().detectCollisions(
            map, gameId, onCollision
          );
        });

        return changes;
      };
    }

    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};