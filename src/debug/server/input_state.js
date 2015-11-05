'use strict';

function DebugInputOverlay (config) {
  if (!config().debug.input) {
    return {};
  }

  return {
    ensembleDebug: {
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