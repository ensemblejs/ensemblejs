'use strict';

import read from 'ok-selector';

module.exports = {
  type: 'BeforePhysicsFrame',
  func: function BeforePhysicsFrame () {
    return function updateWorldTime (Δ, state) {
      return ['ensemble.worldTime', read(state, 'ensemble.worldTime') + Δ];
    };
  }
};