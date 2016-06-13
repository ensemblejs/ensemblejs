'use strict';

let forEachMode = require('../../util/modes').forEachMode;
import {reject, isUndefined} from 'lodash';
const { clone } = require('../../util/fast-clone');

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, system) {

    function OnPhysicsFrame () {
      return function callSystemWithRelevantMapsAndSaveId (delta, state) {
        let changes = [];

        const saveId = state.get('ensemble.saveId');
        const mode = state.get('ensemble.mode');

        forEachMode(maps(), mode, function (map) {

          function onCollision (callback, collisionMap, metadata) {
            let onCollisionArgs = [delta, state, metadata].concat(clone(collisionMap.data) || []);

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