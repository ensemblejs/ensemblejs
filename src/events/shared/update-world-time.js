'use strict';

module.exports = {
  type: 'BeforePhysicsFrame',
  func: function BeforePhysicsFrame () {
    return function updateWorldTime (delta, state) {
      return ['ensemble.worldTime', state.get('ensemble.worldTime') + delta];
    };
  }
};