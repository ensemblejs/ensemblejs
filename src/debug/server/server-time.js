'use strict';

var first = require('lodash').first;
var pluck = require('lodash').pluck;
var filterInternalState = require('../../util/internal-state').filter;

module.exports = {
  type: 'OnPhysicsFrame',
  deps: ['Config', 'InternalState'],
  func: function OnPhysicsFrame (config, internalState) {
    if (!config().debug.time) {
      return config().nothing;
    }

    function updateServerTime () {
      var serverPhysics = filterInternalState(internalState, 'ServerSideEngine');

      return {
        ensembleDebug: {
          serverTime: first(pluck(serverPhysics, 'now'))()
        }
      };
    }

    return updateServerTime;
  }
};