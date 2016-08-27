'use strict';

import stateChangeEvents from '../../util/state-change-events-immutable';
import define from '../../';

module.exports = {
  type: 'StateTracker',
  deps: ['RawStateAccess'],
  func: function StateTracker (rawState) {
    const saves = {};

    const ensureSeeded = (saveId) => {
      saves[saveId] = saves[saveId] || stateChangeEvents();
      return saves[saveId];
    };

    function syncWithRawState () {
      Object.keys(rawState().all()).forEach((saveId) => {
        ensureSeeded(saveId).updateState(rawState().all()[saveId].all());
      });
    }

    define('OnSaveReady', () => () => syncWithRawState());
    define('AfterPhysicsFrame', () => {
      return function takeLatestCopyOfRawState () {
        syncWithRawState();

        Object.keys(saves).forEach((saveId) => {
          ensureSeeded(saveId).detectChangesAndNotifyObservers();
        });
      };
    });

    return {
      sync: syncWithRawState,
      for: (saveId) => ensureSeeded(saveId)
    };
  }
};