'use strict';

const expect = require('expect');
const sinon = require('sinon');

import module from '../../src/util/state-change-events';

describe('state change events, native version', function () {
  let callback = sinon.spy();
  let callback2 = sinon.spy();
  let tracker;

  beforeEach(function () {
    callback.reset();
    callback2.reset();

    tracker = module();
  });

  describe('working with properties', function () {
    describe('when a property changes', function() {
      beforeEach(function () {
        tracker.updateState(
          {property: 'unchanged', a: { b: 'c'}, arr:[{id:1, value: 7}]}
        );
        tracker.detectChangesAndNotifyObservers();
        tracker.onChangeOf('property', callback, 'data');

        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState({property: 'changed'});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.callCount).toBe(1);
      });

      it('should not invoke the callback when the thing does not change', function () {
        tracker.updateState({property: 'unchanged'});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        tracker.updateState({property: 'changed'});
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
        tracker.onChangeOf('property', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState({property: 'changed'});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass only the new values of the thing and the data to the callback', function() {
        tracker.updateState({property: 'changed'});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.firstCall.args).toEqual(['changed', undefined, 'data']);
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        tracker.updateState({property: 'unchanged', a: {b: 'c'}});
        tracker.detectChangesAndNotifyObservers();
        tracker.onChangeTo('property', 'changed', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState({property: 'changed'});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the correct state', function () {
        tracker.updateState({property: 'other'});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        tracker.updateState({property: 'changed'});
        tracker.detectChangesAndNotifyObservers();
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
        tracker.updateState({property: 'something-else', a: {b: 'c'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.callCount).toBe(1);

        callback.reset();
        tracker.onChangeTo('a.b', 'd', callback);
        tracker.updateState({a: {b: 'd'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.callCount).toBe(1);
      });

      describe('when using literals', function () {
        beforeEach(function () {
          callback.reset();
        });

        it('should support strings', function () {
          tracker.onChangeTo('property', 'something-else', callback, 'data');
          tracker.updateState({property: 'something-else'});
          tracker.detectChangesAndNotifyObservers();

          expect(callback.callCount).toBe(1);
        });

        it('should support numbers', function () {
          tracker.onChangeTo('property', 7, callback, 'data');
          tracker.updateState({property: 7});
          tracker.detectChangesAndNotifyObservers();

          expect(callback.callCount).toBe(1);
        });

        it('should support booleans', function () {
          tracker.onChangeTo('property', false, callback, 'data');
          tracker.updateState({property: false});
          tracker.detectChangesAndNotifyObservers();

          expect(callback.callCount).toBe(1);
        });
      });
    });
  });

  describe('working with objects', function () {
    describe('when the object changes', function() {
      beforeEach(function () {
        tracker.updateState({obj: {child: 'value'}});
        tracker.detectChangesAndNotifyObservers();
        tracker.onChangeOf('obj', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState({obj: {child: 'newValue'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change', function () {
        tracker.updateState({obj: {child: 'value'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        tracker.updateState({obj: {child: 'newValue'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, { child: 'value'}, 'data']);
      });
    });

    describe('when there is no prior state', function() {
      beforeEach(function () {
        tracker.onChangeOf('obj', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState({obj: {child: 'newValue'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass the new values of the thing and the data to the callback', function() {
        tracker.updateState({obj: {child: 'newValue'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, undefined, 'data']);
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        tracker.updateState({obj: {child: 'value'}});
        tracker.detectChangesAndNotifyObservers();
        tracker.onChangeTo('obj', {child: 'newValue'}, callback, 'data');
      });

      it('should invoke the callback when the change occurs', function() {
        tracker.updateState({obj: {child: 'newValue'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the desired state', function () {
        tracker.updateState({obj: {child: 'otherValue'}});
        tracker.detectChangesAndNotifyObservers();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        tracker.updateState({obj: {child: 'newValue'}});
        tracker.detectChangesAndNotifyObservers();
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
        tracker.updateState({ numbers: [] });
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementAdded('numbers', callback, 'data');
        tracker.updateState({ numbers: [{id: 1, value: '7'}] });
        tracker.detectChangesAndNotifyObservers();
      });

      it('should invoke the callback with the new element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
      });

      it('should invoked the callback with each existing elements in the array', function() {
        callback.reset();

        tracker.updateState({ numbers: [{id: 1, value: '7'}, {id: 2, value: '17'}] });
        tracker.detectChangesAndNotifyObservers();

        callback.reset();

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
        tracker.updateState({ numbers: [{id: 1, value: '7'}] });
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementRemoved('numbers', callback, 'data');
        tracker.updateState({ numbers: [] });
        tracker.detectChangesAndNotifyObservers();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
      });

      it('should work with dot strings', function () {
        tracker.updateState({ numbers: [{id: 1, value: '7'}] });
        tracker.detectChangesAndNotifyObservers();

        callback2.reset();
        tracker.onElementRemoved('numbers', callback2);
        tracker.updateState({ numbers: [] });
        tracker.detectChangesAndNotifyObservers();

        expect(callback2.callCount).toBe(1);
        expect(callback2.firstCall.args).toEqual([1, {id: 1, value: '7'}, undefined]);
      });
    });

    describe('when an element is changed', function() {
      beforeEach(function() {
        tracker.updateState({ numbers: [{id: 1, value: '6'}] });
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementChanged('numbers', callback, 'data');
        tracker.updateState({ numbers: [{id: 1, value: '7'}] });
        tracker.detectChangesAndNotifyObservers();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, {id: 1, value: '6'}, 'data']);
      });

      it('should not invoke the callback when nothing has changed', function() {
        callback.reset();
        tracker.updateState({ numbers: [{id: 1, value: '7'}] });
        tracker.detectChangesAndNotifyObservers();
        expect(callback.called).toEqual(false);
      });

      it('should work with dot strings', function () {
        callback2.reset();

        tracker.updateState({ numbers: [{id: 1, value: '6'}] });
        tracker.detectChangesAndNotifyObservers();
        tracker.onElementChanged('numbers', callback2);
        tracker.updateState({ numbers: [{id: 1, value: '7'}] });
        tracker.detectChangesAndNotifyObservers();

        expect(callback2.callCount).toBe(1);
        expect(callback2.firstCall.args).toEqual([1, {id: 1, value: '7'}, {id: 1, value: '6'}, undefined]);
      });
    });
  });
});