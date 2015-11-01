'use strict';

var first = require('lodash').first;
var pluck = require('lodash').pluck;
var numeral = require('numeral');
var filterInternalState = require('../../util/internal-state').filter;

function StateSeed () {
  return {
    ensembleDebug: {
      latency: {
        namespace: 'ensemblejs',
        plugin: 'socket',
        name: 'latency',
        frequency: 0,
        samples: 0,
        min: 0,
        max: 0,
        '50th': 0,
        '75th': 0,
        '95th': 0,
        '99th': 0
      }
    }
  };
}

function OnPhysicsFrameAlways (internalState) {
  return function updateServerTime () {
    var SocketServer = filterInternalState(internalState, 'SocketServer');

    if (SocketServer.length > 0) {
      return {
        ensembleDebug: {
          latency: first(pluck(SocketServer, 'latency'))()
        }
      };
    }
  };
}

function OnClientReady ($, tracker) {
  function updateLatency (latency) {
    $()('#debug-latency-frame-samples .value').text(numeral(latency.samples).format('0,0'));
    $()('#debug-latency-frame-min .value').text(numeral(latency.min).format('0.00'));
    $()('#debug-latency-frame-max .value').text(numeral(latency.max).format('0.00'));
    $()('#debug-latency-frame-50th .value').text(numeral(latency['50th']).format('0.00'));
    $()('#debug-latency-frame-75th .value').text(numeral(latency['75th']).format('0.00'));
    $()('#debug-latency-frame-95th .value').text(numeral(latency['95th']).format('0.00'));
    $()('#debug-latency-frame-99th .value').text(numeral(latency['99th']).format('0.00'));
  }

  return function setupDebugTimeDisplay () {
    var frame = require('../../../public/partials/dashboard/frame-square-medium.jade');
    var rectSmall = require('../../../public/partials/dashboard/rect-small.jade');

    $()('#debug').append(frame({id: 'debug-latency-frame'}));
    $()('#debug-latency-frame').append(rectSmall({
      id: 'debug-latency-frame-title',
      title: 'Socket Latency'
    }));

    $()('#debug-latency-frame').append(rectSmall({
      id: 'debug-latency-frame-samples',
      title: 'Samples',
      value: '0'
    }));
    $()('#debug-latency-frame').append(rectSmall({
      id: 'debug-latency-frame-min',
      title: 'Min',
      value: '0'
    }));
    $()('#debug-latency-frame').append(rectSmall({
      id: 'debug-latency-frame-max',
      title: 'Max',
      value: '0'
    }));
    $()('#debug-latency-frame').append(rectSmall({
      id: 'debug-latency-frame-50th',
      title: '50th',
      value: '0'
    }));
    $()('#debug-latency-frame').append(rectSmall({
      id: 'debug-latency-frame-75th',
      title: '75th',
      value: '0'
    }));
    $()('#debug-latency-frame').append(rectSmall({
      id: 'debug-latency-frame-95th',
      title: '95th',
      value: '0'
    }));
    $()('#debug-latency-frame').append(rectSmall({
      id: 'debug-latency-frame-99th',
      title: '99th',
      value: '0'
    }));

    tracker().onChangeOf('ensembleDebug.latency', updateLatency);
  };
}

module.exports = {
  type: 'Latency',
  deps: ['Config', 'DefinePlugin'],
  func: function Latency (config, define) {
    if (!config().debug.network) {
      return config().nothing;
    }

    define()('OnClientReady', ['$', 'StateTracker'], OnClientReady);
    define()('OnPhysicsFrameAlways', ['InternalState'], OnPhysicsFrameAlways);
    define()('StateSeed', StateSeed);
  }
};