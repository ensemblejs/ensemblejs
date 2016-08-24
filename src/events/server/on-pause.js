'use strict';

module.exports = {
  type: 'OnPause',
  deps: ['Config', 'PlayerConnections'],
  func: function OnPause (config, connections) {
    return function pauseSave (state) {
      if (config().ensemble.pause === 'never') {
        return undefined;
      }
      if (config().ensemble.pause === 'all-offline') {
        if (connections().onlineCount(state.getIn('ensemble.saveId')) !== 0) {
          return undefined;
        }
      }

      return ['ensemble.paused', true];
    };
  }
};