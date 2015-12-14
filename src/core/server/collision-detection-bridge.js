'use strict';

var forEachMode = require('../../util/modes').forEachMode;
var clone = require('lodash').clone;

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetection (define, maps, collisionDetectionSystem) {

    function OnPhysicsFrame () {
      return function callSystemWithRelevantMapsAndGameId (state, delta) {
        var changes = [];

        var gameId = state.get('ensemble.gameId');
        var mode = state.get('ensemble.mode');

        forEachMode(maps(), mode, function (map) {

          function onCollision (callback, collisionMap) {
            var onCollisionArgs = clone(collisionMap.data) || [];
            onCollisionArgs.unshift(delta);
            onCollisionArgs.unshift(state);

            changes.push(callback.apply(undefined, onCollisionArgs));
          }

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