'use strict';

module.exports = {
  type: 'OnObserverDisconnected',
  deps: ['StateAccess'],
  func: function (state) {
    return function () {
      return {
        inch: {
          observers: state().get('observers') - 1
        }
      };
    };
  }
};