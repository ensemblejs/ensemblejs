'use strict';

const forEachMode = require('../../util/modes').forEachMode;
const { clone } = require('../../util/fast-clone');
import read from 'ok-selector';

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem'],
  func: function CollisionDetectionBridge (define, maps, system) {

    const detectCollisions = (Δ, state) => {
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

      return changes;
    };

    return { detectCollisions }
  }
};