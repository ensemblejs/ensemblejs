'use strict';

module.exports = {
  type: 'View',
  deps: ['Config', 'StateTracker'],
  func: function View (config, tracker) {
    if (!config().debug.time) {
      return config().nothing;
    }

    var $ = require('zepto-browserify').$;

    function theServerTime (state) {
      return state.ensembleDebug.serverTime;
    }

    function theClientTime (state) {
      return state.ensembleDebug.clientTime;
    }

    function updateServerTime (time) {
      $('#server-time').text(time);
    }

    function updateClientTime (time) {
      $('#client-time').text(time);
    }

    var time = require('../../../public/partials/time.jade');

    return function setupDebugTimeDisplay () {
      $('#debug').append(time());

      tracker().onChangeOf(theServerTime, updateServerTime);
      tracker().onChangeOf(theClientTime, updateClientTime);
    };
  }
};