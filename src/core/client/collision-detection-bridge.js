'use strict';

var forEachMode = require('../../util/modes').forEachMode;
var clone = require('lodash').clone;

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, collisionDetectionSystem) {

    function OnPhysicsFrame (mode) {
      return function callSystemWithRelevantMapsAndSaveId (state, delta) {
        var changes = [];

        forEachMode(maps(), mode(), function (map) {

          function onCollision (callback, collisionMap) {
            var onCollisionArgs = clone(collisionMap.data) || [];
            onCollisionArgs.unshift(delta);
            onCollisionArgs.unshift(state);

            changes.push(callback.apply(undefined, onCollisionArgs));
          }

          collisionDetectionSystem().detectCollisions(map, 'client', onCollision);
        });

        return changes;
      };
    }

    define()('OnPhysicsFrame', ['SaveMode'], OnPhysicsFrame);
  }
};