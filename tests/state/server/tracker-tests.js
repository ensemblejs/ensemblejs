'use strict';

const expect = require('expect');
const sinon = require('sinon');
const requirePlugin = require('../../support').requirePlugin;

const rawStateAccess = {
  get: sinon.spy(),
  all: sinon.spy(),
  resetTo: sinon.spy()
};

function forceCurrentRawState (saveStates) {
  rawStateAccess.all = function () {
    let allState = {};

    saveStates.forEach(saveState => {
      allState[saveState[0]] = { all: () => saveState[1] };
    });

    return allState;
  };
}

describe('Server StateTracker', function () {
  let updateState = sinon.spy();
  let detectChangesAndNotifyObservers = sinon.spy();
  let callback = sinon.spy();
  let callback2 = sinon.spy();
  let afterPhysicsFrame;
  let onSaveReady;

  beforeEach(function () {
    callback.reset();
    callback2.reset();

    let loader = requirePlugin('state/server/tracker', {
      RawStateAccess: rawStateAccess
    }, {
      '../src/util/state-change-events': () => ({
        updateState, detectChangesAndNotifyObservers
      })
    });

    onSaveReady = loader[1].OnSaveReady();
    afterPhysicsFrame = loader[1].AfterPhysicsFrame();

    forceCurrentRawState([
      [1, { property: 'aaaa' }],
      [2, { property: 'bbbb' }]
    ]);

    updateState.reset();
  });

  describe('on save ready', () => {
    it('should sync each save with the raw state', () => {
      onSaveReady();

      expect(updateState.firstCall.args).toEqual([{property: 'aaaa'}]);
      expect(updateState.secondCall.args).toEqual([{property: 'bbbb'}]);
    });
  });

  describe('after each physics frame', () => {
    it('should sync each save with the raw state', () => {
      afterPhysicsFrame();

      expect(updateState.firstCall.args).toEqual([{property: 'aaaa'}]);
      expect(updateState.secondCall.args).toEqual([{property: 'bbbb'}]);
    });

    it('should detect changes and notify observers', () => {
      expect(detectChangesAndNotifyObservers.callCount).toEqual(2);
    });
  });
});