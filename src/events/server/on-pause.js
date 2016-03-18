'use strict';

module.exports = {
  type: 'OnPause',
  deps: ['Config', 'PlayerConnections'],
  func: function OnPause (config, connections) {
    return function pauseSave (state) {
      if (config().ensemble.pause === 'never') {
        return;
      }
      if (config().ensemble.pause === 'all-offline') {
        if (connections().onlineCount(state.get('ensemble.saveId')) === 0) {
          return ['ensemble.paused', true];
        }
      }

      return ['ensemble.paused', true];
    };
  }
};