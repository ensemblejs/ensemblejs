'use strict';

function mouseUp(key) {
  return function() {
    var mouseButtons = {};
    mouseButtons[key] = false;

    return ['ensembleDebug.mouseButtons', mouseButtons];
  };
}

function mouseDown(key) {
  return function() {
    var mouseButtons = {};
    mouseButtons[key] = true;

    return ['ensembleDebug.mouseButtons', mouseButtons];
  };
}

function StateSeed () {
  return {
    ensembleDebug: {
      mouseButtons: {
        primary: false,
        secondary: false,
        tertiary: false
      }
    }
  };
}

function ActionMap () {
  return {
    primary: [
      {call: mouseDown('primary'), whenWaiting: true},
      {call: mouseUp('primary'), onRelease: true, whenWaiting: true}
    ],
    secondary: [
      {call: mouseDown('secondary'), whenWaiting: true},
      {call: mouseUp('secondary'), onRelease: true, whenWaiting: true}
    ],
    tertiary: [
      {call: mouseDown('tertiary'), whenWaiting: true},
      {call: mouseUp('tertiary'), onRelease: true, whenWaiting: true}
    ]
  };
}

function OnClientReady (tracker, $) {
  function showPrimaryButton () { $()('#primary').addClass('pressed'); }
  function hidePrimaryButton () { $()('#primary').removeClass('pressed'); }
  function showSecondaryButton () { $()('#secondary').addClass('pressed'); }
  function hideSecondaryButton () { $()('#secondary').removeClass('pressed'); }
  function showTertiaryButton () { $()('#tertiary').addClass('pressed'); }
  function hideTertiaryButton () { $()('#tertiary').removeClass('pressed'); }

  return function setupMouseIconDebugView () {
    var mouseIcon = require('../../../public/partials/debug/mouse-buttons.pug');

    $()('#debug').append(mouseIcon({id: 'mouse-buttons'}));

    tracker().onChangeTo('ensembleDebug.mouseButtons.primary', true, showPrimaryButton);
    tracker().onChangeTo('ensembleDebug.mouseButtons.primary', false, hidePrimaryButton);
    tracker().onChangeTo('ensembleDebug.mouseButtons.secondary', true, showSecondaryButton);
    tracker().onChangeTo('ensembleDebug.mouseButtons.secondary', false, hideSecondaryButton);
    tracker().onChangeTo('ensembleDebug.mouseButtons.tertiary', true, showTertiaryButton);
    tracker().onChangeTo('ensembleDebug.mouseButtons.tertiary', false, hideTertiaryButton);
  };
}

module.exports = {
  type: 'DebugMouseButtons',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugMouseButtons (config, define) {
    if (!config().debug.input) {
      return;
    }

    define()('StateSeed', StateSeed);
    define()('ActionMap', ActionMap);
    define()('OnClientReady', ['StateTracker', '$'], OnClientReady);
  }
};