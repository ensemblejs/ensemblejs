'use strict';

function StateSeed () {
  return {
    ensembleDebug: {
      mouse: { x: 0, y: 0 }
    }
  };
}

function updatePosition (state, x, y) {
  return ['ensembleDebug.mouse', { x: x, y: y }];
}

function ActionMap () {
  return {
    cursor: [{call: updatePosition, whenWaiting: true}]
  };
}

function OnClientReady (tracker, $) {
  function updateScreen (current) {
    $()('#debug-mouse-position .value').text([current.x, current.y].join(', '));
  }

  return function setupMousePositionDebugView () {
    var rectSmall = require('../../../public/partials/dashboard/rect-small.pug');

    $()('#debug').append(rectSmall({
      id: 'debug-mouse-position',
      title: 'Mouse Position',
      value: '0, 0'
    }));

    tracker().onChangeOf('ensembleDebug.mouse', updateScreen);
  };
}

module.exports = {
  type: 'DebugMousePosition',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugMousePosition (config, define) {
    if (!config().debug.input) {
      return config().nothing;
    }

    define()('StateSeed', StateSeed);
    define()('ActionMap', ActionMap);
    define()('OnClientReady', ['StateTracker', '$'], OnClientReady);
  }
};