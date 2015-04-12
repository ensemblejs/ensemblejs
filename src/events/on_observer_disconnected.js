'use strict';

module.exports = {
  type: 'OnObserverDisconnected',
  deps: ['StateAccess'],
  func: function (state) {
    return function () {
      return {
        ensemble: {
          observers: state().get('observers') - 1
        }
      };
    };
  }
};