'use strict';

var forEachMode = require('../../util/modes').forEachMode;

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, collisionDetectionSystem) {

    function OnPhysicsFrame (mode) {
      return function callSystemWithRelevantMapsAndGameId (state, delta) {
        var changes = [];

        function onCollision (callback) {
          changes.push(callback(state, delta));
        }

        forEachMode(maps(), mode(), function (map) {
          collisionDetectionSystem().detectCollisions(map, 'client', onCollision);
        });

        return changes;
      };
    }

    define()('OnPhysicsFrame', ['GameMode'], OnPhysicsFrame);
  }
};