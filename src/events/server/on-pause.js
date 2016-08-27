'use strict';

import { read } from '../../util/dot-string-support';

module.exports = {
  type: 'OnPause',
  deps: ['Config', 'PlayerConnections'],
  func: function OnPause (config, connections) {
    return function pauseSave (state) {
      if (config().ensemble.pause === 'never') {
        return undefined;
      }
      if (config().ensemble.pause === 'all-offline') {
        if (connections().onlineCount(read(state, 'ensemble.saveId')) !== 0) {
          return undefined;
        }
      }

      return ['ensemble.paused', true];
    };
  }
};