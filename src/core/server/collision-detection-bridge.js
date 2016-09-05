'use strict';

const forEachMode = require('../../util/modes').forEachMode;
import {reject, isUndefined} from 'lodash';
const { clone } = require('../../util/fast-clone');
import read from 'ok-selector';

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, system) {

    function OnPhysicsFrame () {
      return function callSystemWithRelevantMapsAndSaveId (Δ, state) {
        const changes = [];

        const saveId = read(state, 'ensemble.saveId');
        const mode = read(state, 'ensemble.mode');

        function onCollision (callback, map, metadata) {
          const args = [Δ, state, metadata].concat(clone(map.data) || []);

          changes.push(callback(...args));
        }

        forEachMode(maps(), mode, (map) => {
          system().detectCollisions(map, saveId, onCollision);
        });

        return reject(changes, isUndefined);
      };
    }

    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};