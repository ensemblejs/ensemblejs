'use strict';

var forEachMode = require('../../util/modes').forEachMode;
import {clone, reject, isUndefined} from 'lodash';

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetection (define, maps, system) {

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

          system().detectCollisions(map, saveId, onCollision);
        });

        return reject(changes, isUndefined);
      };
    }

    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};