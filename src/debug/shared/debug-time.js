'use strict';

var first = require('lodash').first;
var pluck = require('lodash').pluck;
var filterInternalState = require('../../util/internal-state').filter;

module.exports = {
  type: 'DebugTime',
  deps: ['Config', 'DefinePlugin', 'InternalState'],
  func: function DebugTime (config, define, internalState) {
    if (!config().debug.time) {
      return;
    }

    define()('StateSeed', function StateSeed () {
      return {
        ensembleDebug: {
          clientTime: 0,
          serverTime: 0
        }
      };
    });

    function updateTime () {
      var serverPhysics = filterInternalState(internalState, 'ServerSideEngine');
      var clientPhysics = filterInternalState(internalState, 'PhysicsLoop');

      var ensembleDebug = {};

      if (clientPhysics.length > 0) {
        ensembleDebug.clientTime = Math.round(first(pluck(clientPhysics, 'now'))());
      }
      if (serverPhysics.length > 0) {
        ensembleDebug.serverTime = Math.round(first(pluck(serverPhysics, 'now'))());
      }

      return ['ensembleDebug', ensembleDebug];
    }

    define()('BeforePhysicsFrame', function BeforePhysicsFrame () {
      return updateTime;
    });

    define()('OnClientReady', ['$', 'StateTracker'], function OnClientReady ($, tracker) {
      var lastKnownServerTime;
      var lastKnownClientTime;
      var largest = 0;

      function updateDifference () {
        var difference = Math.abs(lastKnownServerTime - lastKnownClientTime);
        if (difference > largest) {
          largest = difference;
        }

        $()('#debug-time-difference .value').text(difference);
        $()('#debug-largest-time-difference .value').text(largest);
      }

      function updateServerTime (time) {
        lastKnownServerTime = time;
        updateDifference();

        $()('#debug-server-time .value').text(time);
      }

      function updateClientTime (time) {
        lastKnownClientTime = time;
        updateDifference();

        $()('#debug-client-time .value').text(time);
      }

      return function setupDebugTimeDisplay () {
        var frame = require('../../../public/partials/dashboard/frame-rect-medium.jade');
        var rectSmall = require('../../../public/partials/dashboard/rect-small.jade');

        $()('#debug').append(frame({id: 'debug-time'}));

        $()('#debug-time').append(rectSmall({
          id: 'debug-server-time',
          title: 'Server Time',
          value: '0'
        }));
        $()('#debug-time').append(rectSmall({
          id: 'debug-client-time',
          title: 'Client Time',
          value: '0'
        }));
        $()('#debug-time').append(rectSmall({
          id: 'debug-time-difference',
          title: 'Time Difference',
          value: '0'
        }));
        $()('#debug-time').append(rectSmall({
          id: 'debug-largest-time-difference',
          title: 'Largest Difference',
          value: '0'
        }));

        tracker().onChangeOf('ensembleDebug.serverTime', updateServerTime);
        tracker().onChangeOf('ensembleDebug.clientTime', updateClientTime);
      };
    });
  }
};