'use strict';

var forEachMode = require('../../util/modes').forEachMode;
var clone = require('lodash').clone;

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetection (define, maps, collisionDetectionSystem) {

    function OnPhysicsFrame () {
      return function callSystemWithRelevantMapsAndSaveId (delta, state) {
        var changes = [];

        var saveId = state.get('ensemble.saveId');
        var mode = state.get('ensemble.mode');

        forEachMode(maps(), mode, function (map) {

          function onCollision (callback, collisionMap) {
            var onCollisionArgs = clone(collisionMap.data) || [];
            onCollisionArgs.unshift(state);
            onCollisionArgs.unshift(delta);

            changes.push(callback(...onCollisionArgs));
          }

          collisionDetectionSystem().detectCollisions(
            map, saveId, onCollision
          );
        });

        return changes;
      };
    }

    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};