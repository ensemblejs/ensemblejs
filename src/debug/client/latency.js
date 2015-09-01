'use strict';

module.exports = {
  type: 'OnReady',
  deps: ['Config', 'StateTracker', '$'],
  func: function DebugLatency (config, tracker, $) {
    if (!config().debug.network) {
      return config().nothing;
    }

    function theLatency (state) {
      return state.ensembleDebug.latency;
    }

    function updateLatency (latency) {
      $()('#samples').text(latency.samples);
      $()('#min').text(latency.min);
      $()('#max').text(latency.max);
      $()('#percentile50th').text(latency['50th']);
      $()('#percentile75th').text(latency['75th']);
      $()('#percentile95th').text(latency['95th']);
      $()('#percentile99th').text(latency['99th']);
    }

    var time = require('../../../public/partials/latency.jade');

    return function setupDebugTimeDisplay () {
      $()('#debug').append(time());

      tracker().onChangeOf(theLatency, updateLatency);
    };
  }
};