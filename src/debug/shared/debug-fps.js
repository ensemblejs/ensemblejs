'use strict';

var first = require('lodash').first;
var pluck = require('lodash').pluck;
var numeral = require('numeral');
var filterInternalState = require('../../util/internal-state').filter;

function StateSeed () {
  return {
    ensembleDebug: {
      fps: {
        namespace: 'ensemblejs',
        plugin: 'render-loop',
        name: 'fps',
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

function BeforePhysicsFrame (internalState) {
  return function updateServerTime () {
    var renderLoopStats = filterInternalState(internalState, 'RenderLoop');
    if (renderLoopStats.length === 0) {
      return;
    }

    return {
      ensembleDebug: {
        fps: first(pluck(renderLoopStats, 'fps'))()
      }
    };
  };
}

function OnClientReady ($, tracker) {
  function updateFps (fps) {
    $()('#debug-fps-rate .value').text(numeral(fps.rate).format('0'));
    $()('#debug-fps-samples .value').text(numeral(fps.samples).format('0,0'));
    $()('#debug-fps-min .value').text(numeral(fps.min).format('0.00'));
    $()('#debug-fps-max .value').text(numeral(fps.max).format('0.00'));
    $()('#debug-fps-50th .value').text(numeral(fps['50th']).format('0.00'));
    $()('#debug-fps-75th .value').text(numeral(fps['75th']).format('0.00'));
    $()('#debug-fps-95th .value').text(numeral(fps['95th']).format('0.00'));
    $()('#debug-fps-99th .value').text(numeral(fps['99th']).format('0.00'));
  }

  return function setupDebugOverlay () {
    var frame = require('../../../public/partials/dashboard/frame-square-medium.jade');
    var rectSmall = require('../../../public/partials/dashboard/rect-small.jade');

    $()('#debug').append(frame({id: 'debug-fps'}));
    $()('#debug-fps').append(rectSmall({
      id: 'debug-fps-rate',
      title: 'FPS'
    }));

    $()('#debug-fps').append(rectSmall({
      id: 'debug-fps-samples',
      title: 'Samples',
      value: '0'
    }));
    $()('#debug-fps').append(rectSmall({
      id: 'debug-fps-min',
      title: 'Min (ms)',
      value: '0'
    }));
    $()('#debug-fps').append(rectSmall({
      id: 'debug-fps-max',
      title: 'Max (ms)',
      value: '0'
    }));
    $()('#debug-fps').append(rectSmall({
      id: 'debug-fps-50th',
      title: '50th (ms)',
      value: '0'
    }));
    $()('#debug-fps').append(rectSmall({
      id: 'debug-fps-75th',
      title: '75th (ms)',
      value: '0'
    }));
    $()('#debug-fps').append(rectSmall({
      id: 'debug-fps-95th',
      title: '95th (ms)',
      value: '0'
    }));
    $()('#debug-fps').append(rectSmall({
      id: 'debug-fps-99th',
      title: '99th (ms)',
      value: '0'
    }));

    tracker().onChangeOf('ensembleDebug.fps', updateFps);
  };
}

module.exports = {
  type: 'DebugCore',
  deps: ['DefinePlugin', 'Config'],
  func: function DebugCore (define, config) {
    if (!config().debug.fps) {
      return;
    }

    define()('StateSeed', StateSeed);
    define()('OnClientReady', ['$', 'StateTracker'], OnClientReady);
    define()('BeforePhysicsFrame', ['InternalState'], BeforePhysicsFrame);
  }
};