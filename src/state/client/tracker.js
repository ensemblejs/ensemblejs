'use strict';

import Immutable from 'immutable';
import stateTracker from '../../util/state-change-events-immutable';
import define from '../../'

function StateTracker () {
  const tracker = stateTracker();

  define('OnSeedInitialState', ['RawStateAccess'], (rawState) => {
    return function storeInitialServerState (state) {
      rawState().resetTo(Immutable.fromJS(state));
      tracker.updateState(rawState().get().all());
    };
  });

  define('AfterPhysicsFrame', ['RawStateAccess'], (rawState) => {
    return function takeLatestCopyOfRawState () {
      tracker.updateState(rawState().get().all());
      tracker.detectChangesAndNotifyObservers();
    };
  });

  define('CurrentState', () => ({ get: tracker.currentValue }));
  define('CurrentServerState', () => ({ get: tracker.currentValue }));

  return tracker;
}

module.exports = { type: 'StateTracker', func: StateTracker };