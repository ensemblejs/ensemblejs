'use strict';

var first = require('lodash').first;
var pluck = require('lodash').pluck;
var filterInternalState = require('../../util/internal-state').filter;

module.exports = {
  type: 'OnPhysicsFrameAlways',
  deps: ['Config', 'InternalState'],
  func: function OnPhysicsFrame (config, internalState) {
    if (!config().debug.time) {
      return config().nothing;
    }

    function updateServerTime () {
      var clientPhysics = filterInternalState(internalState, 'PhysicsLoop');

      return {
        ensembleDebug: {
          clientTime: Math.round(first(pluck(clientPhysics, 'now'))())
        }
      };
    }

    return updateServerTime;
  }
};