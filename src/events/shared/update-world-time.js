'use strict';

module.exports = {
  type: 'BeforePhysicsFrame',
  func: function BeforePhysicsFrame () {
    return function updateWorldTime (Δ, state) {
      return ['ensemble.worldTime', state.getIn('ensemble.worldTime') + Δ];
    };
  }
};