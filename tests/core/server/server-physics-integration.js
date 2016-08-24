'use strict';

const expect = require('expect');
const sinon = require('sinon');
const { defer } = require('../../support');
const mutatorPlugins = require('../../support').plugin();
const trackerPlugins = require('../../support').plugin();
const module = '../../../src/state/server/tracker';

require('../../../src/state/server/mutator').func(defer(mutatorPlugins.define));
const mutatorDeps = mutatorPlugins.deps();
let mutateNow = mutatorDeps.SyncMutator();
let applyPendingMerges = mutatorDeps.ApplyPendingMerges();
let rawStateAccess = mutatorDeps.RawStateAccess();

function applyMutation (saveStates) {
  saveStates.forEach(saveState => {
    mutateNow(saveState[0], saveState[1]);
  });
}

let tracker;

describe('ServerPhysics-StateTracker Integration', function () {
  let callback = sinon.spy();
  let callback2 = sinon.spy();
  let afterPhysicsFrame;
  let deps;

  beforeEach(function () {
    callback.reset();
    callback2.reset();
    tracker = require(module).func(defer(trackerPlugins.define), defer(rawStateAccess));

    deps = trackerPlugins.deps();
    afterPhysicsFrame = deps.AfterPhysicsFrame();

    tracker = tracker.for(1);
  });

  describe('working with properties', function () {
    describe('when a property changes', function() {
      beforeEach(function () {
        applyMutation(
          [
            [1, {property: 'unchanged', a: { b: 'c'}, arr:[{id:1, value: 7}]}]
          ]
        );
        afterPhysicsFrame();
        tracker.onChangeOf('property', callback, 'data');

        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();

        expect(callback.callCount).toBe(1);
      });

      it('should not invoke the callback when the thing does not change', function () {
        applyMutation([[1, {property: 'unchanged'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual(['changed', 'unchanged', 'data']);
      });

      it('should work with dot strings', function () {
        tracker.onChangeOf('property', callback, 'data');
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);

        callback.reset();

        tracker.onChangeOf('a.b', callback);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);
        expect(callback.firstCall.args).toEqual(['c', 'c', undefined]);
      });

      it('should work with dot strings enhancements', function () {
        tracker.onChangeOf('property', callback, 'data');
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);

        callback.reset();

        tracker.onChangeOf('arr:1.value', callback);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);
        expect(callback.firstCall.args).toEqual([7, 7, undefined]);
      });
    });

    describe('when there is no prior state', function() {
      beforeEach(function () {
        tracker.onChangeOf('property', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass only the new values of the thing and the data to the callback', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual(['changed', undefined, 'data']);
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        applyMutation([[1, {property: 'unchanged', a: {b: 'c'}}]]);
        afterPhysicsFrame();
        tracker.onChangeTo('property', 'changed', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the correct state', function () {
        applyMutation([[1, {property: 'other'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual(['changed', 'unchanged', 'data']);
      });

      it('should call the callback immediately if the state is already true', function() {
        callback.reset();
        tracker.onChangeTo('property', 'unchanged', callback, 'data');
        expect(callback.calledOnce).toBe(true);
      });

      it('should work with dot strings', function () {
        callback.reset();
        tracker.onChangeTo('property', 'something-else', callback);
        applyMutation([[1, {property: 'something-else', a: {b: 'c'}}]]);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);

        callback.reset();
        tracker.onChangeTo('a.b', 'd', callback);
        applyMutation([[1, {a: {b: 'd'}}]]);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);
      });

      describe('when using literals', function () {
        beforeEach(function () {
          callback.reset();
        });

        it('should support strings', function () {
          tracker.onChangeTo('property', 'something-else', callback, 'data');
          applyMutation([[1, {property: 'something-else'}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });

        it('should support numbers', function () {
          tracker.onChangeTo('property', 7, callback, 'data');
          applyMutation([[1, {property: 7}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });

        it('should support booleans', function () {
          tracker.onChangeTo('property', false, callback, 'data');
          applyMutation([[1, {property: false}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });
      });
    });
  });

  describe('working with objects', function () {
    describe('when the object changes', function() {
      beforeEach(function () {
        applyMutation([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        applyPendingMerges();

        tracker.onChangeOf('obj', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change', function () {
        applyMutation([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();

        const current = callback.firstCall.args[0].toJS();
        const prior = callback.firstCall.args[1].toJS();
        const data = callback.firstCall.args[2];

        expect(current).toEqual({ child: 'newValue'});
        expect(prior).toEqual({ child: 'value'});
        expect(data).toEqual('data');
      });
    });

    describe('when there is no prior state', function() {
      beforeEach(function () {
        tracker.onChangeOf('obj', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass the new values of the thing and the data to the callback', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();

        const current = callback.firstCall.args[0].toJS();
        const prior = callback.firstCall.args[1];
        const data = callback.firstCall.args[2];

        expect(current).toEqual({ child: 'newValue'});
        expect(prior).toEqual(undefined);
        expect(data).toEqual('data');
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        applyMutation([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        tracker.onChangeTo('obj', {child: 'newValue'}, callback, 'data');
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the desired state', function () {
        applyMutation([[1, {obj: {child: 'otherValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();

        const current = callback.firstCall.args[0].toJS();
        const prior = callback.firstCall.args[1].toJS();
        const data = callback.firstCall.args[2];

        expect(current).toEqual({ child: 'newValue'});
        expect(prior).toEqual({ child: 'value'});
        expect(data).toEqual('data');
      });

      it('should call the callback immediately if the state is already true', function() {
        callback.reset();
        tracker.onChangeTo('obj', {child: 'value'}, callback, 'data');
        expect(callback.calledOnce).toBe(true);
      });
    });
  });

  describe('working with arrays', function () {
    describe('when an element is added', function() {
      beforeEach(function() {
        applyMutation([[1, { numbers: [] }]]);
        afterPhysicsFrame();
        tracker.onElementAdded('numbers', callback, 'data');
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the new element and the data', function() {
        expect(callback.calledOnce).toBe(true);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1].toJS();
        const data = callback.firstCall.args[2];

        expect(id).toEqual(1);
        expect(current).toEqual({ id: 1, value: '7'});
        expect(data).toEqual('data');
      });

      it('should invoked the callback with each existing elements in the array', function() {
        callback.reset();
        trackerPlugins.reset();
        tracker = require(module).func(defer(trackerPlugins.define), defer(rawStateAccess));
        tracker = tracker.for(1);

        deps = trackerPlugins.deps();
        afterPhysicsFrame = deps.AfterPhysicsFrame();

        applyMutation([
          [1, { numbers: [{id: 1, value: '7'}, {id: 2, value: '17'}] }]
        ]);
        afterPhysicsFrame();
        tracker.onElementAdded('numbers', callback, 'data');
        expect(callback.callCount).toBe(2);

        const id1 = callback.firstCall.args[0];
        const current1 = callback.firstCall.args[1].toJS();
        const data1 = callback.firstCall.args[2];

        const id2 = callback.secondCall.args[0];
        const current2 = callback.secondCall.args[1].toJS();
        const data2 = callback.secondCall.args[2];

        expect(id1).toEqual(1);
        expect(current1).toEqual({ id: 1, value: '7'});
        expect(data1).toEqual('data');

        expect(id2).toEqual(2);
        expect(current2).toEqual({ id: 2, value: '17'});
        expect(data2).toEqual('data');
      });

      it('should work with dot strings', function () {
        callback.reset();
        tracker.onElementAdded('numbers', callback);
        expect(callback.callCount).toBe(1);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1].toJS();
        const data = callback.firstCall.args[2];

        expect(id).toEqual(1);
        expect(current).toEqual({ id: 1, value: '7'});
        expect(data).toEqual(undefined);
      });
    });

    describe('when an element is removed', function() {
      beforeEach(function() {
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
        tracker.onElementRemoved('numbers', callback, 'data');
        applyMutation([[1, { numbers: [] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1].toJS();
        const data = callback.firstCall.args[2];

        expect(id).toEqual(1);
        expect(current).toEqual({ id: 1, value: '7'});
        expect(data).toEqual('data');
      });

      it('should work with dot strings', function () {
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();

        callback2.reset();
        tracker.onElementRemoved('numbers', callback2);
        applyMutation([[1, { numbers: [] }]]);
        afterPhysicsFrame();

        expect(callback2.callCount).toBe(1);

        const id = callback2.firstCall.args[0];
        const current = callback2.firstCall.args[1].toJS();
        const data = callback2.firstCall.args[2];

        expect(id).toEqual(1);
        expect(current).toEqual({ id: 1, value: '7'});
        expect(data).toEqual(undefined);
      });
    });

    describe('when an element is changed', function() {
      beforeEach(function() {
        applyMutation([[1, { numbers: [{id: 1, value: '6'}] }]]);
        afterPhysicsFrame();
        tracker.onElementChanged('numbers', callback, 'data');
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1].toJS();
        const prior = callback.firstCall.args[2].toJS();
        const data = callback.firstCall.args[3];

        expect(id).toEqual(1);
        expect(current).toEqual({ id: 1, value: '7'});
        expect(prior).toEqual({ id: 1, value: '6'});
        expect(data).toEqual('data');
      });

      it('should not invoke the callback when nothing has changed', function() {
        callback.reset();
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
        expect(callback.called).toEqual(false);
      });

      it('should work with dot strings', function () {
        callback2.reset();

        applyMutation([[1, { numbers: [{id: 1, value: '6'}] }]]);
        afterPhysicsFrame();
        tracker.onElementChanged('numbers', callback2);
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();

        expect(callback2.callCount).toBe(1);

        const id = callback2.firstCall.args[0];
        const current = callback2.firstCall.args[1].toJS();
        const prior = callback2.firstCall.args[2].toJS();
        const data = callback2.firstCall.args[3];

        expect(id).toEqual(1);
        expect(current).toEqual({ id: 1, value: '7'});
        expect(prior).toEqual({ id: 1, value: '6'});
        expect(data).toEqual(undefined);
      });
    });
  });

  describe('handling multiple games', function () {
    let game1Callback = sinon.spy();
    let game2Callback = sinon.spy();
    let t1;
    let t2;

    beforeEach(function () {
      tracker = require(module).func(defer(trackerPlugins.define), defer(rawStateAccess));
      deps = trackerPlugins.deps();
      afterPhysicsFrame = deps.AfterPhysicsFrame();
      t1 = tracker.for(1);
      t2 = tracker.for(2);

      applyMutation([
        [1, { property: 'unchanged' }],
        [2, { property: 'unchanged' }]
      ]);
      afterPhysicsFrame();

      t1.onChangeOf('property', game1Callback);
      t2.onChangeOf('property', game2Callback);

      game1Callback.reset();
      game2Callback.reset();
    });

    it('should ignore state changes in other games', function () {
      applyMutation([
        [1, { property: 'unchanged' }],
        [2, { property: 'changed' }]
      ]);
      afterPhysicsFrame();

      expect(game1Callback.calledOnce).toBe(false);
      expect(game2Callback.calledOnce).toBe(true);

      game1Callback.reset();
      game2Callback.reset();

      applyMutation([
        [1, { property: 'changed' }],
        [2, { property: 'changed' }]
      ]);
      afterPhysicsFrame();

      expect(game1Callback.calledOnce).toBe(true);
      expect(game2Callback.calledOnce).toBe(false);
    });
  });
});
