'use strict';

import Immutable from 'immutable';
import stateTracker from '../../util/state-change-events-immutable';

module.exports = {
  type: 'StateTracker',
  deps: ['DefinePlugin'],
  func: function StateTracker (define) {
    const tracker = stateTracker();

    define()('OnSeedInitialState', ['RawStateAccess'], rawState => {
      return function storeInitialServerState (state) {
        rawState().resetTo(Immutable.fromJS(state));
        tracker.updateState(rawState().get());
      };
    });

    define()('AfterPhysicsFrame', ['RawStateAccess'], rawState => {
      return function takeLatestCopyOfRawState () {
        tracker.updateState(rawState().get());
        tracker.detectChangesAndNotifyObservers();
      };
    });

    define()('CurrentState', () => ({
      get: tracker.currentValue
    }));

    define()('CurrentServerState', () => ({
      get: tracker.currentValue
    }));

    return {
      onChangeOf: tracker.onChangeOf,
      onChangeTo: tracker.onChangeTo,
      onElement: tracker.onElement,
      onElementChanged: tracker.onElementChanged,
      onElementAdded: tracker.onElementAdded,
      onElementRemoved: tracker.onElementRemoved
    };
  }
};