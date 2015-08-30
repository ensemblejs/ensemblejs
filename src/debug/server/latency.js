'use strict';

var first = require('lodash').first;
var pluck = require('lodash').pluck;
var filterInternalState = require('../../util/internal-state').filter;

module.exports = {
  type: 'OnPhysicsFrame',
  deps: ['Config', 'InternalState'],
  func: function OnPhysicsFrame (config, internalState) {
    if (!config().debug.network) {
      return config().nothing;
    }

    function updateServerTime () {
      var SocketServer = filterInternalState(internalState, 'SocketServer');

      return {
        ensembleDebug: {
          latency: first(pluck(SocketServer, 'latency'))()
        }
      };
    }

    return updateServerTime;
  }
};