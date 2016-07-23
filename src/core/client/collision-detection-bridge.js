'use strict';

let forEachMode = require('../../util/modes').forEachMode;
const { clone } = require('../../util/fast-clone');
import {reject, isUndefined} from 'lodash';
import {join} from '../../util/array';

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, system) {

    function OnPhysicsFrame (mode) {
      return function callSystemWithRelevantMapsAndSaveId (Δ, state) {
        let changes = [];

        function onCollision (callback, map, metadata) {
          let args = [Δ, state, metadata];
          join(args, clone(map.data));

          changes.push(callback(...args));
        }

        forEachMode(maps(), mode(), map => {
          system().detectCollisions(map, 'client', onCollision);
        });

        return reject(changes, isUndefined);
      };
    }

    define()('OnPhysicsFrame', ['SaveMode'], OnPhysicsFrame);
  }
};