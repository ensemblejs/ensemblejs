'use strict';

function DebugMultiplayer (config) {
  if (!config().debug.multiplayer) {
    return {};
  }

  return {
    ensembleDebug: {
      players: 0
    }
  };
}

module.exports = {
  type: 'StateSeed',
  deps: ['Config'],
  func: DebugMultiplayer
};