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

    var lastKnownServerTime;
    var lastKnownClientTime;
    var largest = 0;

    function updateDifference () {
      var difference = Math.abs(lastKnownServerTime - lastKnownClientTime);
      if (difference > largest) {
        largest = difference;
      }

      $('#server-client-time-difference').text(difference);
      $('#largest-server-client-time-difference').text(largest);
    }

    function updateServerTime (time) {
      lastKnownServerTime = time;
      updateDifference();

      $('#server-time').text(time);
    }

    function updateClientTime (time) {
      lastKnownClientTime = time;
      updateDifference();

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