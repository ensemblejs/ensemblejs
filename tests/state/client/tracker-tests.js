'use strict';

var expect = require('expect');
var sinon = require('sinon');
var isEqual = require('lodash').isEqual;
var defer = require('../../support').defer;
var plugin = require('../../support').plugin();
var modulePath = '../../../src/state/client/tracker';

var the = function (name) { return function (state) { return state[name]; }; };
var to = function (name) { return function (state) { return state[name]; }; };
var from = function (name) { return function (state) { return state[name]; }; };
var within = function (name) { return function (state) { return state[name]; }; };
var equals = function (expectedValue) {
  return function (currentValue) {
      return isEqual(currentValue, expectedValue);
  };
};

var tracker;
var rawStateAccess = {
	get: sinon.spy(),
	resetTo: sinon.spy()
};

function forceCurrentRawState (newState) {
	rawStateAccess.get = function () { return newState; };
}

var logger = require('../../fake/logger');

describe('StateTracker', function () {
	var callback = sinon.spy();
	var callback2 = sinon.spy();
	var afterPhysicsFrame;
	var onClientStart;
	var onIncomingServerPacket;

	beforeEach(function () {
		callback.reset();
		callback2.reset();
		plugin.reset();
		tracker = require(modulePath).func(defer(plugin.define), defer(logger));
		afterPhysicsFrame = plugin.deps().AfterPhysicsFrame(defer(rawStateAccess));
		onClientStart = plugin.deps().OnClientStart(defer(rawStateAccess));
		onIncomingServerPacket = plugin.deps().OnIncomingServerPacket();
	});

	describe('working with property', function () {
		describe('when a property changes', function() {
			beforeEach(function () {
				forceCurrentRawState({ property: 'unchanged', a: { b: 'c'} });
				afterPhysicsFrame();
				tracker.onChangeOf(the('property'), callback, 'data');

				callback.reset();
			});

			it('should invoke the callback when the change occurs', function() {
				forceCurrentRawState({property: 'changed'});
				afterPhysicsFrame();
				expect(callback.callCount).toBe(1);
			});

			it('should not invoke the callback when the thing does not change', function () {
				forceCurrentRawState({property: 'unchanged'});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(false);
			});

			it('should pass the old and new values of the thing and the data to the callback', function() {
				forceCurrentRawState({property: 'changed'});
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
		});

		describe('when there is no prior state', function() {
			beforeEach(function () {
				tracker.onChangeOf(the('property'), callback, 'data');
				callback.reset();
			});

			it('should invoke the callback when the change occurs', function() {
				forceCurrentRawState({property: 'changed'});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(true);
			});

			it('should pass only the new values of the thing and the data to the callback', function() {
				forceCurrentRawState({property: 'changed'});
				afterPhysicsFrame();
				expect(callback.firstCall.args).toEqual(['changed', undefined, 'data']);
			});
		});

		describe('when detecting a change to a particular value', function() {
			beforeEach(function () {
				forceCurrentRawState({property: 'unchanged', a: {b: 'c'}});
				afterPhysicsFrame();
				tracker.onChangeTo(the('property'), equals('changed'), callback, 'data');
				callback.reset();
			});

			it('should invoke the callback when the change occurs', function() {
				forceCurrentRawState({property: 'changed'});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(true);
			});

			it('should not invoke the callback when the thing does not change to the correct state', function () {
				forceCurrentRawState({property: 'other'});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(false);
			});

			it('should pass the old and new values of the thing and the data to the callback', function() {
				forceCurrentRawState({property: 'changed'});
				afterPhysicsFrame();
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
				forceCurrentRawState({property: 'something-else', a: {b: 'c'}});
				afterPhysicsFrame();
				expect(callback.callCount).toBe(1);

				callback.reset();
				tracker.onChangeTo('a.b', 'd', callback);
				forceCurrentRawState({a: {b: 'd'}});
				afterPhysicsFrame();
				expect(callback.callCount).toBe(1);
			});

			describe('when using literals', function () {
				beforeEach(function () {
					callback.reset();
				});

				it('should support strings', function () {
					tracker.onChangeTo(the('property'), 'something-else', callback, 'data');
					forceCurrentRawState({property: 'something-else'});
					afterPhysicsFrame();

					expect(callback.callCount).toBe(1);
				});

				it('should support numbers', function () {
					tracker.onChangeTo(the('property'), 7, callback, 'data');
					forceCurrentRawState({property: 7});
					afterPhysicsFrame();

					expect(callback.callCount).toBe(1);
				});

				it('should support booleans', function () {
					tracker.onChangeTo(the('property'), false, callback, 'data');
					forceCurrentRawState({property: false});
					afterPhysicsFrame();

					expect(callback.callCount).toBe(1);
				});
			});
		});
	});

	describe('working with objects', function () {
		describe('when the object changes', function() {
			beforeEach(function () {
				forceCurrentRawState({obj: {child: 'value'}});
				afterPhysicsFrame();
				tracker.onChangeOf(the('obj'), callback, 'data');
				callback.reset();
			});

			it('should invoke the callback when the change occurs', function() {
				forceCurrentRawState({obj: {child: 'newValue'}});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(true);
			});

			it('should not invoke the callback when the thing does not change', function () {
				forceCurrentRawState({obj: {child: 'value'}});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(false);
			});

			it('should pass the old and new values of the thing and the data to the callback', function() {
				forceCurrentRawState({obj: {child: 'newValue'}});
				afterPhysicsFrame();
				expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, { child: 'value'}, 'data']);
			});
		});

		describe('when there is no prior state', function() {
			beforeEach(function () {
				tracker.onChangeOf(the('obj'), callback, 'data');
				callback.reset();
			});

			it('should invoke the callback when the change occurs', function() {
				forceCurrentRawState({obj: {child: 'newValue'}});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(true);
			});

			it('should pass the new values of the thing and the data to the callback', function() {
				forceCurrentRawState({obj: {child: 'newValue'}});
				afterPhysicsFrame();
				expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, undefined, 'data']);
			});
		});

		describe('when detecting a change to a particular value', function() {
			beforeEach(function () {
				forceCurrentRawState({obj: {child: 'value'}});
				afterPhysicsFrame();
				tracker.onChangeTo(the('obj'), equals({child: 'newValue'}), callback, 'data');
			});

			it('should invoke the callback when the change occurs', function() {
				forceCurrentRawState({obj: {child: 'newValue'}});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(true);
			});

			it('should not invoke the callback when the thing does not change to the desired state', function () {
				forceCurrentRawState({obj: {child: 'otherValue'}});
				afterPhysicsFrame();
				expect(callback.calledOnce).toBe(false);
			});

			it('should pass the old and new values of the thing and the data to the callback', function() {
				forceCurrentRawState({obj: {child: 'newValue'}});
				afterPhysicsFrame();
				expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, { child: 'value'}, 'data']);
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
				forceCurrentRawState({ numbers: [] });
				afterPhysicsFrame();
				tracker.onElementAdded(to('numbers'), callback, 'data');
				forceCurrentRawState({ numbers: [{id: 1, value: '7'}] });
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
				afterPhysicsFrame = plugin.deps().AfterPhysicsFrame(defer(rawStateAccess));

				forceCurrentRawState({ numbers: [{id: 1, value: '7'}, {id: 2, value: '17'}] });
				afterPhysicsFrame();
				tracker.onElementAdded(to('numbers'), callback, 'data');
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
				forceCurrentRawState({ numbers: [{id: 1, value: '7'}] });
				afterPhysicsFrame();
				tracker.onElementRemoved(from('numbers'), callback, 'data');
				forceCurrentRawState({ numbers: [] });
				afterPhysicsFrame();
			});

			it('should invoke the callback with the removed element and the data', function() {
				expect(callback.calledOnce).toBe(true);
				expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
			});

			it('should work with dot strings', function () {
				forceCurrentRawState({ numbers: [{id: 1, value: '7'}] });
				afterPhysicsFrame();

				callback2.reset();
				tracker.onElementRemoved('numbers', callback2);
				forceCurrentRawState({ numbers: [] });
				afterPhysicsFrame();

				expect(callback2.callCount).toBe(1);
				expect(callback2.firstCall.args).toEqual([1, {id: 1, value: '7'}, undefined]);
			});
		});

		describe('when an element is changed', function() {
			beforeEach(function() {
				forceCurrentRawState({ numbers: [{id: 1, value: '6'}] });
				afterPhysicsFrame();
				tracker.onElementChanged(within('numbers'), callback, 'data');
				forceCurrentRawState({ numbers: [{id: 1, value: '7'}] });
				afterPhysicsFrame();
			});

			it('should invoke the callback with the removed element and the data', function() {
				expect(callback.calledOnce).toBe(true);
				expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, {id: 1, value: '6'}, 'data']);
			});

			it('should not invoke the callback when nothing has changed', function() {
				callback.reset();
				forceCurrentRawState({ numbers: [{id: 1, value: '7'}] });
				afterPhysicsFrame();
				expect(callback.called).toEqual(false);
			});

			it('should work with dot strings', function () {
				callback2.reset();

				forceCurrentRawState({ numbers: [{id: 1, value: '6'}] });
				afterPhysicsFrame();
				tracker.onElementChanged('numbers', callback2);
				forceCurrentRawState({ numbers: [{id: 1, value: '7'}] });
				afterPhysicsFrame();

				expect(callback2.callCount).toBe(1);
				expect(callback2.firstCall.args).toEqual([1, {id: 1, value: '7'}, {id: 1, value: '6'}, undefined]);
			});
		});
	});

	describe('on setup', function () {
		it('should update the latest server state', function () {
			onClientStart({prop: 'a'});
			expect(plugin.deps().CurrentServerState().get(the('prop'))).toEqual('a');
		});
	});

	describe('on packet', function () {
		it('should update the latest server state', function () {
			onIncomingServerPacket({id: 1, saveState: {prop: 'c'}});
			expect(plugin.deps().CurrentServerState().get(the('prop'))).toEqual('c');
		});
	});

	describe('getting the current value', function () {
		it('should return the current value', function() {
			forceCurrentRawState({property: 'unchanged'});
			afterPhysicsFrame();
			expect(plugin.deps().CurrentState().get(the('property'))).toEqual('unchanged');
		});
	});
});