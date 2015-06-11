'use strict';

module.exports = {
  type: 'OnObserverDisconnected',
  deps: ['NewState'],
  func: function (newState) {
    return ['*', function (state) {
      var observerCount = state.for('ensemble').get('observers');

      return newState.create('ensemble', {observers: observerCount - 1});
    }];
  }
};