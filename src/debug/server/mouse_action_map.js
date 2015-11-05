'use strict';

function RouteAllInput (config) {
  function mouseUp(key) {
    return function() {
      var mouseButtons = {};
      mouseButtons[key] = false;

      return {
        ensembleDebug: {
          mouseButtons: mouseButtons
        }
      };
    };
  }

  function mouseDown(key) {
    return function() {
      var mouseButtons = {};
      mouseButtons[key] = true;

      return {
        ensembleDebug: {
          mouseButtons: mouseButtons
        }
      };
    };
  }

  if (!config().debug.inputOverlay) {
    return {};
  }

  return {
    primary: [
      {target: mouseDown('primary')},
      {target: mouseUp('primary'), onRelease: true}
    ],
    secondary: [
      {target: mouseDown('secondary')},
      {target: mouseUp('secondary'), onRelease: true}
    ],
    tertiary: [
      {target: mouseDown('tertiary')},
      {target: mouseUp('tertiary'), onRelease: true}
    ]
  };
}

module.exports = {
  type: 'ActionMap',
  deps: ['Config'],
  func: RouteAllInput
};