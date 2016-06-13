'use strict';

let forEachMode = require('../../util/modes').forEachMode;
const { clone } = require('../../util/fast-clone');
import {reject, isUndefined} from 'lodash';

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, system) {

    function OnPhysicsFrame (mode) {
      return function callSystemWithRelevantMapsAndSaveId (delta, state) {
        let changes = [];

        forEachMode(maps(), mode(), function (map) {

          function onCollision (callback, collisionMap, metadata) {
            let onCollisionArgs = [delta, state, metadata].concat(clone(collisionMap.data) || []);

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