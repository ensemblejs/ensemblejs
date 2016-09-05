'use strict';

var expect = require('expect');
var sinon = require('sinon');
var isEqual = require('lodash').isEqual;
import read from 'ok-selector';

var the = name => state => read(state, name);
var to = name => state => read(state, name);
var from = name => state => read(state, name);
var within = name => state => read(state, name);
var equals = function (expectedValue) {
  return function (currentValue) {
    if (!currentValue || currentValue.toJS === undefined) {
      return isEqual(currentValue, expectedValue);
    }

    return isEqual(currentValue.toJS(), expectedValue);
  };
};

import module from '../../src/util/state-change-events-immutable';
import Immutable from 'immutable';

describe('state change events, immutablejs version', function () {
  var callback = sinon.spy();
  var callback2 = sinon.spy();
  let tracker;

  beforeEach(function () {
    callback.reset();
    callback2.reset();

    tracker = module();
  });

  describe('working with property', function () {
    describe('when a property changes', function() {
      beforeEach(function () {
        tracker.updateState(Immutable.fromJS({ property: 'unchanged', a: { b: 'c'}, arr: [{id:1, value: 7}] }));
        tracker.detectChangesAndNotifyObservers();
        tracker.onChangeOf(the('property'), callback, 'data');

        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState(Immutable.fromJS({property: 'changed'}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.callCount).toBe(1);
      });

      it('should not invoke the callback when the thing does not change', function () {
        tracker.updateState(Immutable.fromJS({property: 'unchanged'}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        tracker.updateState(Immutable.fromJS({property: 'changed'}));
        tracker.detectChangesAndNotifyObservers();

        expect(callback.firstCall.args).toEqual(['changed', 'unchanged', 'data']);
      });

      it('should work with dot strings', function () {
        const callback3 = sinon.spy();
        const callback4 = sinon.spy();

        tracker.onChangeOf('property', callback3, 'data');
        tracker.onChangeOf('a.b', callback4);

        callback3.reset();
        callback4.reset();

        tracker.detectChangesAndNotifyObservers();

        expect(callback3.callCount).toBe(1);
        expect(callback4.callCount).toBe(1);
        expect(callback4.firstCall.args).toEqual(['c', undefined, undefined]);
      });

      it('should work with dot strings enhancements', function () {
        const callback3 = sinon.spy();
        const callback4 = sinon.spy();

        tracker.onChangeOf('property', callback3, 'data');
        tracker.onChangeOf('arr:1.value', callback4);

        callback3.reset();
        callback4.reset();

        tracker.detectChangesAndNotifyObservers();

        expect(callback3.callCount).toBe(1);
        expect(callback4.callCount).toBe(1);
        expect(callback4.firstCall.args).toEqual([7, undefined, undefined]);
      });
    });

    describe('when there is no prior state', function() {
      beforeEach(function () {
        tracker.onChangeOf(the('property'), callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState(Immutable.fromJS({property: 'changed'}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass the new values of the thing and the data to the callback', function() {
        tracker.updateState(Immutable.fromJS({property: 'changed'}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.firstCall.args).toEqual(['changed', undefined, 'data']);
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        tracker.updateState(Immutable.fromJS({property: 'unchanged', a: {b: 'c'}}));
        tracker.detectChangesAndNotifyObservers();
        tracker.onChangeTo(the('property'), equals('changed'), callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState(Immutable.fromJS({property: 'changed'}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the correct state', function () {
        tracker.updateState(Immutable.fromJS({property: 'other'}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        tracker.updateState(Immutable.fromJS({property: 'changed'}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.firstCall.args).toEqual(['changed', 'unchanged', 'data']);
      });

      it('should call the callback immediately if the state is already true', function() {
        callback.reset();
        tracker.onChangeTo(the('property'), equals('unchanged'), callback, 'data');
        expect(callback.calledOnce).toBe(true);
      });

      it('should work with dot strings', function () {
        callback.reset();
        tracker.onChangeTo('property', 'something-else', callback);
        tracker.updateState(Immutable.fromJS({property: 'something-else', a: {b: 'c'}}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.callCount).toBe(1);

        callback.reset();
        tracker.onChangeTo('a.b', 'd', callback);
        tracker.updateState(Immutable.fromJS({a: {b: 'd'}}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.callCount).toBe(1);
      });

      describe('when using literals', function () {
        beforeEach(function () {
          callback.reset();
        });

        it('should support strings', function () {
          tracker.onChangeTo(the('property'), 'something-else', callback, 'data');
          tracker.updateState(Immutable.fromJS({property: 'something-else'}));
          tracker.detectChangesAndNotifyObservers();

          expect(callback.callCount).toBe(1);
        });

        it('should support numbers', function () {
          tracker.onChangeTo(the('property'), 7, callback, 'data');
          tracker.updateState(Immutable.fromJS({property: 7}));
          tracker.detectChangesAndNotifyObservers();

          expect(callback.callCount).toBe(1);
        });

        it('should support booleans', function () {
          tracker.onChangeTo(the('property'), false, callback, 'data');
          tracker.updateState(Immutable.fromJS({property: false}));
          tracker.detectChangesAndNotifyObservers();

          expect(callback.callCount).toBe(1);
        });
      });
    });
  });

  describe('working with objects', function () {
    describe('when the object changes', function() {
      beforeEach(function () {
        tracker.updateState(Immutable.fromJS({obj: {child: 'value'}}));
        tracker.detectChangesAndNotifyObservers();
        tracker.onChangeOf(the('obj'), callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState(Immutable.fromJS({obj: {child: 'newValue'}}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change', function () {
        tracker.updateState(Immutable.fromJS({obj: {child: 'value'}}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        tracker.updateState(Immutable.fromJS({obj: {child: 'newValue'}}));
        tracker.detectChangesAndNotifyObservers();

        const current = callback.firstCall.args[0];
        const prior = callback.firstCall.args[1];
        const data = callback.firstCall.args[2];

        expect(current.toJS()).toEqual({ child: 'newValue'});
        expect(prior.toJS()).toEqual({ child: 'value'});
        expect(data).toEqual(data);
      });
    });

    describe('when there is no prior state', function() {
      beforeEach(function () {
        tracker.onChangeOf(the('obj'), callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState(Immutable.fromJS({obj: {child: 'newValue'}}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass the new values of the thing and the data to the callback', function() {
        tracker.updateState(Immutable.fromJS({obj: {child: 'newValue'}}));
        tracker.detectChangesAndNotifyObservers();

        const current = callback.firstCall.args[0];
        const prior = callback.firstCall.args[1];
        const data = callback.firstCall.args[2];

        expect(current.toJS()).toEqual({ child: 'newValue'});
        expect(prior).toBe(undefined);
        expect(data).toEqual('data');
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        tracker.updateState(Immutable.fromJS({obj: {child: 'value'}}));
        tracker.detectChangesAndNotifyObservers();
        tracker.onChangeTo(the('obj'), equals({child: 'newValue'}), callback, 'data');
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState(Immutable.fromJS({obj: {child: 'newValue'}}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the desired state', function () {
        tracker.updateState(Immutable.fromJS({obj: {child: 'otherValue'}}));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        tracker.updateState(Immutable.fromJS({obj: {child: 'newValue'}}));
        tracker.detectChangesAndNotifyObservers();

        const current = callback.firstCall.args[0];
        const prior = callback.firstCall.args[1];
        const data = callback.firstCall.args[2];

        expect(current.toJS()).toEqual({ child: 'newValue'});
        expect(prior.toJS()).toEqual({ child: 'value'});
        expect(data).toEqual('data');
      });

      it('should call the callback immediately if the state is already true', function() {
        callback.reset();
        tracker.onChangeTo(the('obj'), equals({child: 'value'}), callback, 'data');
        expect(callback.calledOnce).toBe(true);
      });
    });
  });

  describe('working with arrays', function () {
    describe('when an element is added', function() {
      beforeEach(function() {
        tracker.updateState(Immutable.fromJS({ numbers: [] }));
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementAdded(to('numbers'), callback, 'data');
        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '7'}] }));
        tracker.detectChangesAndNotifyObservers();
      });

      it('should invoke the callback with the new element and the data', function() {
        expect(callback.callCount).toBe(1);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1];
        const data = callback.firstCall.args[2];

        expect(id).toEqual(1);
        expect(current.toJS()).toEqual({id: 1, value: '7'});
        expect(data).toEqual('data');
      });

      it('should invoked the callback with each existing elements in the array', function() {
        callback.reset();
        tracker = module();

        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '7'}, {id: 2, value: '17'}] }));
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementAdded(to('numbers'), callback, 'data');

        const id1 = callback.firstCall.args[0];
        const current1 = callback.firstCall.args[1];
        const data1 = callback.firstCall.args[2];

        const id2 = callback.secondCall.args[0];
        const current2 = callback.secondCall.args[1];
        const data2 = callback.secondCall.args[2];

        expect(callback.callCount).toBe(2);

        expect(id1).toEqual(1);
        expect(current1.toJS()).toEqual({id: 1, value: '7'});
        expect(data1).toEqual('data');

        expect(id2).toEqual(2);
        expect(current2.toJS()).toEqual({id: 2, value: '17'});
        expect(data2).toEqual('data');
      });

      it('should work with dot strings', function () {
        callback.reset();
        tracker.onElementAdded('numbers', callback);

        expect(callback.callCount).toBe(1);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1];

        expect(id).toEqual(1);
        expect(current.toJS()).toEqual({id: 1, value: '7'});
      });
    });

    describe('when an element is removed', function() {
      beforeEach(function() {
        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '7'}] }));
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementRemoved(from('numbers'), callback, 'data');
        tracker.updateState(Immutable.fromJS({ numbers: [] }));
        tracker.detectChangesAndNotifyObservers();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1];
        const data = callback.firstCall.args[2];

        expect(id).toEqual(1);
        expect(current.toJS()).toEqual({id: 1, value: '7'});
        expect(data).toEqual('data');
      });

      it('should work with dot strings', function () {
        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '7'}] }));
        tracker.detectChangesAndNotifyObservers();

        callback2.reset();
        tracker.onElementRemoved('numbers', callback2);
        tracker.updateState(Immutable.fromJS({ numbers: [] }));
        tracker.detectChangesAndNotifyObservers();

        expect(callback2.callCount).toBe(1);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1];

        expect(id).toEqual(1);
        expect(current.toJS()).toEqual({id: 1, value: '7'});
      });
    });

    describe('when an element is changed', function() {
      beforeEach(function() {
        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '6'}] }));
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementChanged(within('numbers'), callback, 'data');
        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '7'}] }));
        tracker.detectChangesAndNotifyObservers();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1];
        const prior = callback.firstCall.args[2];
        const data = callback.firstCall.args[3];

        expect(id).toEqual(1);
        expect(current.toJS()).toEqual({id: 1, value: '7'});
        expect(prior.toJS()).toEqual({id: 1, value: '6'});
        expect(data).toEqual('data');
      });

      it('should not invoke the callback when nothing has changed', function() {
        callback.reset();
        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '7'}] }));
        tracker.detectChangesAndNotifyObservers();
        expect(callback.called).toEqual(false);
      });

      it('should work with dot strings', function () {
        callback2.reset();

        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '6'}] }));
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementChanged('numbers', callback2);
        tracker.updateState(Immutable.fromJS({ numbers: [{id: 1, value: '7'}] }));
        tracker.detectChangesAndNotifyObservers();

        expect(callback2.callCount).toBe(1);

        const id = callback.firstCall.args[0];
        const current = callback.firstCall.args[1];
        const prior = callback.firstCall.args[2];

        expect(id).toEqual(1);
        expect(current.toJS()).toEqual({id: 1, value: '7'});
        expect(prior.toJS()).toEqual({id: 1, value: '6'});
      });
    });
  });

  describe('getting the current value', function () {
    it('should return the current value', function() {
      tracker.updateState(Immutable.fromJS({property: 'unchanged'}));
      tracker.detectChangesAndNotifyObservers();
      expect(tracker.currentValue(the('property'))).toEqual('unchanged');
    });
  });
});