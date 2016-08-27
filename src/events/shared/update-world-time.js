'use strict';

import { read } from '../../util/dot-string-support';

module.exports = {
  type: 'BeforePhysicsFrame',
  func: function BeforePhysicsFrame () {
    return function updateWorldTime (Δ, state) {
      return ['ensemble.worldTime', read(state, 'ensemble.worldTime') + Δ];
    };
  }
};