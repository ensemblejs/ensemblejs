'use strict';

var forEachMode = require('../../util/modes').forEachMode;
import {clone, reject, isUndefined} from 'lodash';

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, system) {

    function OnPhysicsFrame (mode) {
      return function callSystemWithRelevantMapsAndSaveId (delta, state) {
        var changes = [];

        forEachMode(maps(), mode(), function (map) {

          function onCollision (callback, collisionMap) {
            var onCollisionArgs = clone(collisionMap.data) || [];
            onCollisionArgs.unshift(state);
            onCollisionArgs.unshift(delta);

            changes.push(callback(...onCollisionArgs));
          }

          system().detectCollisions(map, 'client', onCollision);
        });

        return reject(changes, isUndefined);
      };
    }

    define()('OnPhysicsFrame', ['SaveMode'], OnPhysicsFrame);
  }
};