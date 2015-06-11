'use strict';

module.exports = {
  type: 'OnObserverConnected',
  deps: ['StateAccess', 'NewState'],
  func: function (state, newState) {
    return function (gameId) {
      var observerCount = state().for(gameId, 'ensemble').get('observers');

      return newState.create('ensemble', {observers: observerCount + 1});
    };
  }
};