'use strict';

const expect = require('expect');
const sinon = require('sinon');
const defer = require('../../support').defer;
const plugin = require('../../support').plugin();
const modulePath = '../../../src/state/server/tracker';
const Immutable = require('immutable');

let tracker;
const rawStateAccess = {
  get: sinon.spy(),
  all: sinon.spy(),
  resetTo: sinon.spy()
};

function forceCurrentRawState (saveStates) {
  rawStateAccess.all = function () {
    let allState = {};

    saveStates.forEach(saveState => {
      allState[saveState[0]] = Immutable.fromJS(saveState[1]);
    });

    return allState;
  };
}

let logger = require('../../fake/logger');

describe('StateTracker', function () {
  let callback = sinon.spy();
  let callback2 = sinon.spy();
  let afterPhysicsFrame;
  let deps;

  beforeEach(function () {
    callback.reset();
    callback2.reset();
    plugin.reset();
    tracker = require(modulePath).func(defer(plugin.define), defer(logger));

    deps = plugin.deps();
    afterPhysicsFrame = deps.AfterPhysicsFrame(defer(rawStateAccess));

    tracker = tracker.for(1);
  });

  describe('working with properties', function () {
    describe('when a property changes', function() {
      beforeEach(function () {
        forceCurrentRawState(
          [
            [1, {property: 'unchanged', a: { b: 'c'}, arr:[{id:1, value: 7}]}]
          ]
        );
        afterPhysicsFrame();
        tracker.onChangeOf('property', callback, 'data');

        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        forceCurrentRawState([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);
      });

      it('should not invoke the callback when the thing does not change', function () {
        forceCurrentRawState([[1, {property: 'unchanged'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        forceCurrentRawState([[1, {property: 'changed'}]]);
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
        forceCurrentRawState([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass only the new values of the thing and the data to the callback', function() {
        forceCurrentRawState([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual(['changed', undefined, 'data']);
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        forceCurrentRawState([[1, {property: 'unchanged', a: {b: 'c'}}]]);
        afterPhysicsFrame();
        tracker.onChangeTo('property', 'changed', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        forceCurrentRawState([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the correct state', function () {
        forceCurrentRawState([[1, {property: 'other'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        forceCurrentRawState([[1, {property: 'changed'}]]);
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
        forceCurrentRawState([[1, {property: 'something-else', a: {b: 'c'}}]]);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);

        callback.reset();
        tracker.onChangeTo('a.b', 'd', callback);
        forceCurrentRawState([[1, {a: {b: 'd'}}]]);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);
      });

      describe('when using literals', function () {
        beforeEach(function () {
          callback.reset();
        });

        it('should support strings', function () {
          tracker.onChangeTo('property', 'something-else', callback, 'data');
          forceCurrentRawState([[1, {property: 'something-else'}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });

        it('should support numbers', function () {
          tracker.onChangeTo('property', 7, callback, 'data');
          forceCurrentRawState([[1, {property: 7}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });

        it('should support booleans', function () {
          tracker.onChangeTo('property', false, callback, 'data');
          forceCurrentRawState([[1, {property: false}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });
      });
    });
  });

  describe('working with objects', function () {
    describe('when the object changes', function() {
      beforeEach(function () {
        forceCurrentRawState([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        tracker.onChangeOf('obj', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        forceCurrentRawState([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change', function () {
        forceCurrentRawState([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        forceCurrentRawState([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, { child: 'value'}, 'data']);
      });
    });

    describe('when there is no prior state', function() {
      beforeEach(function () {
        tracker.onChangeOf('obj', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        forceCurrentRawState([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass the new values of the thing and the data to the callback', function() {
        forceCurrentRawState([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, undefined, 'data']);
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        forceCurrentRawState([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        tracker.onChangeTo('obj', {child: 'newValue'}, callback, 'data');
      });

      it('should invoke the callback when the change occurs', function() {
        forceCurrentRawState([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the desired state', function () {
        forceCurrentRawState([[1, {obj: {child: 'otherValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        forceCurrentRawState([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, { child: 'value'}, 'data']);
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
        forceCurrentRawState([[1, { numbers: [] }]]);
        afterPhysicsFrame();
        tracker.onElementAdded('numbers', callback, 'data');
        forceCurrentRawState([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the new element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
      });

      it('should invoked the callback with each existing elements in the array', function() {
        callback.reset();
        plugin.reset();
        tracker = require(modulePath).func(defer(plugin.define), defer(logger));
        tracker = tracker.for(1);

        deps = plugin.deps();
        afterPhysicsFrame = deps.AfterPhysicsFrame(defer(rawStateAccess));

        forceCurrentRawState([
          [1, { numbers: [{id: 1, value: '7'}, {id: 2, value: '17'}] }]
        ]);
        afterPhysicsFrame();
        tracker.onElementAdded('numbers', callback, 'data');
        expect(callback.callCount).toBe(2);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
        expect(callback.secondCall.args).toEqual([2, {id: 2, value: '17'}, 'data']);
      });

      it('should work with dot strings', function () {
        callback.reset();
        tracker.onElementAdded('numbers', callback);
        expect(callback.callCount).toBe(1);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, undefined]);
      });
    });

    describe('when an element is removed', function() {
      beforeEach(function() {
        forceCurrentRawState([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
        tracker.onElementRemoved('numbers', callback, 'data');
        forceCurrentRawState([[1, { numbers: [] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
      });

      it('should work with dot strings', function () {
        forceCurrentRawState([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();

        callback2.reset();
        tracker.onElementRemoved('numbers', callback2);
        forceCurrentRawState([[1, { numbers: [] }]]);
        afterPhysicsFrame();

        expect(callback2.callCount).toBe(1);
        expect(callback2.firstCall.args).toEqual([1, {id: 1, value: '7'}, undefined]);
      });
    });

    describe('when an element is changed', function() {
      beforeEach(function() {
        forceCurrentRawState([[1, { numbers: [{id: 1, value: '6'}] }]]);
        afterPhysicsFrame();
        tracker.onElementChanged('numbers', callback, 'data');
        forceCurrentRawState([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, {id: 1, value: '6'}, 'data']);
      });

      it('should not invoke the callback when nothing has changed', function() {
        callback.reset();
        forceCurrentRawState([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
        expect(callback.called).toEqual(false);
      });

      it('should work with dot strings', function () {
        callback2.reset();

        forceCurrentRawState([[1, { numbers: [{id: 1, value: '6'}] }]]);
        afterPhysicsFrame();
        tracker.onElementChanged('numbers', callback2);
        forceCurrentRawState([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();

        expect(callback2.callCount).toBe(1);
        expect(callback2.firstCall.args).toEqual([1, {id: 1, value: '7'}, {id: 1, value: '6'}, undefined]);
      });
    });
  });

  describe('handling multiple games', function () {
    let game1Callback = sinon.spy();
    let game2Callback = sinon.spy();
    let t1;
    let t2;

    beforeEach(function () {
      tracker = require(modulePath).func(defer(plugin.define), defer(logger));
      deps = plugin.deps();
      afterPhysicsFrame = deps.AfterPhysicsFrame(defer(rawStateAccess));
      t1 = tracker.for(1);
      t2 = tracker.for(2);

      forceCurrentRawState([
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
      forceCurrentRawState([
        [1, { property: 'unchanged' }],
        [2, { property: 'changed' }]
      ]);
      afterPhysicsFrame();

      expect(game1Callback.calledOnce).toBe(false);
      expect(game2Callback.calledOnce).toBe(true);

      game1Callback.reset();
      game2Callback.reset();

      forceCurrentRawState([
        [1, { property: 'changed' }],
        [2, { property: 'changed' }]
      ]);
      afterPhysicsFrame();

      expect(game1Callback.calledOnce).toBe(true);
      expect(game2Callback.calledOnce).toBe(false);
    });
  });
});