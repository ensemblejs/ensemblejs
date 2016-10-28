'use strict';

const forEachMode = require('../../util/modes').forEachMode;
const { clone } = require('../../util/fast-clone');
import {join} from '../../util/array';
import { wrap } from '../../util/breakdown-profiler';

module.exports = {
  type: 'CollisionDetectionBridge',
  deps: ['DefinePlugin', 'CollisionMap', 'CollisionDetectionSystem', 'SaveMode'],
  func: function CollisionDetectionBridge (define, maps, system, mode) {

    const detectCollisions = (Δ, state) => {
      const changes = [];

      function onCollision (callback, map, metadata) {
        const args = [Δ, state, metadata];
        join(args, clone(map.data));

        changes.push(callback(...args));
      }

      forEachMode(maps(), mode(), (map) => {
        system().detectCollisions(map, 'client', onCollision);
      });

      return changes;
    };

    return { detectCollisions: wrap(detectCollisions) }
  }
};