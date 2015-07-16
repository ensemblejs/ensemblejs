'use strict';

function DebugInputOverlay (config) {
  if (!config().debug.inputOverlay) {
    return {};
  }

  return {
    ensembleDebug: {
      mouse: {
        x: 0,
        y: 0
      },
      mouseButtons: {
        primary: false,
        secondary: false,
        tertiary: false
      },
      keys: [],
      touches: []
    }
  };
}

module.exports = {
  type: 'StateSeed',
  deps: ['Config'],
  func: DebugInputOverlay
};