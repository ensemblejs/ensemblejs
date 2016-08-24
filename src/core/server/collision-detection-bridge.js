'use strict';

let forEachMode = require('../../util/modes').forEachMode;
import {reject, isUndefined} from 'lodash';
const { clone } = require('../../util/fast-clone');

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, system) {

    function OnPhysicsFrame () {
      return function callSystemWithRelevantMapsAndSaveId (Δ, state) {
        let changes = [];

        const saveId = state.getIn('ensemble.saveId');
        const mode = state.getIn('ensemble.mode');

        function onCollision (callback, map, metadata) {
          let args = [Δ, state, metadata].concat(clone(map.data) || []);

          changes.push(callback(...args));
        }

        forEachMode(maps(), mode, map => {
          system().detectCollisions(map, saveId, onCollision);
        });

        return reject(changes, isUndefined);
      };
    }

    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};