'use strict';

function RouteAllInput (config, newState) {
  function mouseUp(key) {
    return function() {
      var ensembleDebug = {
        mouseButtons: {}
      };
      ensembleDebug.mouseButtons[key] = false;

      return newState().create('ensembleDebug', ensembleDebug);
    };
  }

  function mouseDown(key) {
    return function() {
      var ensembleDebug = {
        mouseButtons: {}
      };
      ensembleDebug.mouseButtons[key] = true;

      return newState().create('ensembleDebug', ensembleDebug);
    };
  }

  function updateState (state, x, y) {
    var ensembleDebug = {
      mouse: {
        x: x,
        y: y
      }
    };

    return newState().create('ensembleDebug', ensembleDebug);
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
    ],
    cursor: [{target: updateState}]
  };
}

module.exports = {
  type: 'ActionMap',
  deps: ['Config', 'NewState'],
  func: RouteAllInput
};