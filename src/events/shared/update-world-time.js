'use strict';

module.exports = {
  type: 'BeforePhysicsFrame',
  func: function BeforePhysicsFrame () {
    return function updateWorldTime (delta, state) {
      return ['ensemble.worldTime', state.ensemble.worldTime + delta];
    };
  }
};