'use strict';

var sinon = require('sinon');
var expect = require('expect');

var defer = require('../../support').defer;
var plugin = require('../../support').plugin();

var model = {
	noEvent: sinon.spy(),
	keyEvent: sinon.spy(),
	keyPressEvent: sinon.spy(),
	keyModCtrl: sinon.spy(),
	keyPressModCtrl: sinon.spy(),
	mouseDownEvent: sinon.spy(),
	mouseClickEvent: sinon.spy(),
	touchEvent: sinon.spy(),
	cursorEvent: sinon.spy(),
	leftStickEvent: sinon.spy(),
	rightStickEvent: sinon.spy(),
	waiting: sinon.spy()
};

var currentState = {
	ensemble: {
		waitingForPlayers: true
	}
};

var actions = [];
var rawData = {};
var beforePhysicsFrame;
var mutator = sinon.spy();
var save = {
	id: 1,
	mode: 'arcade'
};
var playerId = 3;
var queue = [];
var inputQueue = {
	length: function () { return queue.length; },
	get: function(i) { return queue[i]; }
};
function newUserInput (rawData, timestamp, save, playerId) {
	queue.push({ rawData, timestamp, save, playerId});
}

var fakeLogger = require('../../fake/logger');

describe('Input Bindings', function() {
	var clock;

	beforeEach(function() {
		clock = sinon.useFakeTimers();

		model.noEvent.reset();
		model.keyEvent.reset();
		model.keyPressEvent.reset();
		model.keyModCtrl.reset();
		model.keyPressModCtrl.reset();
		model.mouseDownEvent.reset();
		model.mouseClickEvent.reset();
		model.touchEvent.reset();
		model.cursorEvent.reset();
		model.leftStickEvent.reset();
		model.rightStickEvent.reset();

		model.waiting.reset();

		mutator.reset();

		actions = [['*'], {
			'key': [
				{call: model.keyEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.keyPressEvent, onRelease: true, noEventKey: 'model', whenWaiting: true},
				{call: model.keyModCtrl, noEventKey: 'model', modifiers: ['ctrl'], whenWaiting: true},
				{call: model.keyPressModCtrl, onRelease: true, noEventKey: 'model', modifiers: ['ctrl'], whenWaiting: true},
				{ack: 'something', whenWaiting: true}
			],
			'not-waiting': [{call: model.waiting, noEventKey: 'model'}],
			'button1': [
				{call: model.mouseDownEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.mouseClickEvent, onRelease: true, noEventKey: 'model', whenWaiting: true}
			],
			'touch0': [{call: model.touchEvent, noEventKey: 'model', whenWaiting: true}, {call: model.waiting, noEventKey: 'model'}],
			'cursor': [{call: model.cursorEvent, noEventKey: 'model', whenWaiting: true}, {call: model.waiting, noEventKey: 'model' }],
			'nothing': [{call: model.noEvent, noEventKey: 'model', whenWaiting: true}, {call: model.waiting, noEventKey: 'model'}],
			'left-stick': [{call: model.leftStickEvent, noEventKey: 'model', whenWaiting: true}, {call: model.waiting, noEventKey: 'model'}],
			'right-stick': [{call: model.rightStickEvent, noEventKey: 'model', whenWaiting: true}, {call: model.waiting, noEventKey: 'model'}]
		}];


		require('../../../src/input/client/process_pending_input').func(defer([actions]), defer(plugin.define), defer(mutator), defer(fakeLogger));
		beforePhysicsFrame = plugin.deps().BeforePhysicsFrame(defer(inputQueue));
	});

	afterEach(function () {
		clock.restore();
	});

	describe('when no input has been received', function() {
		beforeEach(function() {
			rawData = { keys: [], touches: [] };
			newUserInput(rawData, undefined, save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should call the "noEvent" on the "model" bound as "nothing"', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.noEvent.called).toBe(true);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			fakeLogger.debug.reset();
			beforePhysicsFrame(16, currentState);
			expect(fakeLogger.debug.firstCall.args).toEqual([{key: 'nothing'}, 'ActionMap called']);
		});

		it('should pass in the standard event data', function () {
			beforePhysicsFrame(16, currentState);
			var expected = {timestamp: undefined, playerId: 3, delta: 16};

			expect(model.noEvent.firstCall.args[0]).toEqual(currentState);
			expect(model.noEvent.firstCall.args[1]).toEqual({});
			expect(model.noEvent.firstCall.args[2]).toEqual(expected);
		});

		describe('when no input is received while waiting for players', function () {

			beforeEach(function() {
				rawData = { keys: [], touches: [] };
				newUserInput(rawData, undefined, save, playerId);

				model.waiting.reset();
			});

			it('should not call actions without the "whenWaiting" flag', function () {
				beforePhysicsFrame(16, currentState);
				expect(model.waiting.called).toBe(false);
			});
		});

		describe('when the action map has not been configured for "nothing"', function() {
			beforeEach(function() {
				require('../../../src/input/client/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(fakeLogger));
				beforePhysicsFrame = plugin.deps().BeforePhysicsFrame(defer(inputQueue));

				mutator.reset();
			});

			it ('should do nothing', function() {
				beforePhysicsFrame(16, currentState);
				expect(model.noEvent.called).toBe(false);
				expect(mutator.called).toBe(false);
			});
		});
	});

	describe('when key input is received', function() {
		beforeEach(function() {
			rawData = { keys: [{key: 'key'}], touches: [] };
			newUserInput(rawData, undefined, save, playerId);

			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			model.keyPressModCtrl.reset();
			mutator.reset();
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.keyEvent.firstCall.args).toEqual([currentState, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			fakeLogger.debug.reset();
			beforePhysicsFrame(16, currentState);
			expect(fakeLogger.debug.firstCall.args).toEqual([{key: 'key'}, 'ActionMap called']);
		});

		it('should ignore the key case', function () {
			beforePhysicsFrame(16, currentState);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { keys: [{key: 'KEY'}], touches: [] };
			newUserInput(rawData, undefined, save, playerId);
			beforePhysicsFrame(16, currentState);

			expect(model.keyEvent.firstCall.args).toEqual([currentState, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should not call bindings w/ modifiers if no modifier pressed', function () {

			beforePhysicsFrame(16, currentState);

			expect(model.keyEvent.firstCall.args).toEqual([currentState, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should only call bindings w/ modifiers if modifier pressed', function () {
			beforePhysicsFrame(16, currentState);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			mutator.reset();

			queue = [];

			rawData = { keys: [{key: 'key', modifiers: ['ctrl']}], touches: [] };
			newUserInput(rawData, undefined, save, playerId);
			beforePhysicsFrame(16, currentState);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(true);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when key input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { singlePressKeys: [{key: 'key'}], touches: [] };
			newUserInput(rawData, undefined, save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.keyPressEvent.firstCall.args).toEqual([currentState, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should ignore the key case', function () {
			beforePhysicsFrame(16, currentState);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { singlePressKeys: [{key: 'KEY'}], touches: [] };
			newUserInput(rawData, undefined, save, playerId);
			beforePhysicsFrame(16, currentState);

			expect(model.keyPressEvent.firstCall.args).toEqual([currentState, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should not call bindings w/ modifiers if no modifier pressed', function () {
			beforePhysicsFrame(16, currentState);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.firstCall.args).toEqual([currentState, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should only call bindings w/ modifiers if modifier pressed', function () {
			beforePhysicsFrame(16, currentState);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			model.keyPressModCtrl.reset();
			mutator.reset();

			queue = [];

			rawData = { singlePressKeys: [{key: 'key', modifiers: ['ctrl']}], touches: [] };
			newUserInput(rawData, undefined, save, playerId);
			beforePhysicsFrame(16, currentState);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(true);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when key input is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { keys: [{key: 'notBound'}], singlePressKeys: [{key: 'notBound'}], touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should do nothing if there are no events bound to that key', function () {
			beforePhysicsFrame(16, currentState);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when key input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { keys: [{key: 'key'}, {key: 'not-waiting'}] };
			newUserInput(rawData, undefined, save, playerId);

			model.waiting.reset();
			model.keyEvent.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			beforePhysicsFrame(16, currentState);
			expect(model.waiting.called).toBe(false);
		});

		it('should call actions with the "whenWaiting" flag', function () {
			beforePhysicsFrame(16, currentState);
			expect(model.keyEvent.called).toBe(true);
		});
	});

	describe('when touch input is received', function() {
		beforeEach(function() {
			rawData = { touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.touchEvent.firstCall.args).toEqual([currentState, {x: 4, y: 5}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			fakeLogger.debug.reset();
			beforePhysicsFrame(16, currentState);
			expect(fakeLogger.debug.firstCall.args).toEqual([{key: 'touch0'}, 'ActionMap called']);
		});
	});

	describe('when touch is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { keys: [{key: 'key'}], touches: [{id: 1, x: 4, y: 5}] };
			newUserInput(rawData, undefined, save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should do nothing if there are no events bound to touch', function () {
			beforePhysicsFrame(16, currentState);

			expect(model.touchEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when touch input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, save, playerId);

			model.waiting.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			beforePhysicsFrame(16, currentState);
			expect(model.waiting.called).toBe(false);
		});
	});

	describe('when mouse input is received', function() {
		beforeEach(function() {
			rawData = { keys: [], mouse: {x: 6, y: 7 }};
			newUserInput(rawData, undefined, save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.cursorEvent.firstCall.args).toEqual([currentState, {x:6 , y:7}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			fakeLogger.debug.reset();
			beforePhysicsFrame(16, currentState);
			expect(fakeLogger.debug.firstCall.args).toEqual([{key: 'cursor'}, 'ActionMap called']);
		});
	});

	describe('when mouse input is received but not bound', function() {
		beforeEach(function() {
			rawData = { x: 6, y: 7 };
			require('../../../src/input/client/process_pending_input').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(fakeLogger));
			beforePhysicsFrame = plugin.deps().BeforePhysicsFrame(defer(inputQueue));
			newUserInput(rawData, undefined, save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call any matching functions with the touch coordinates', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.cursorEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});

	describe('when mouse input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { singlePressKeys: [{key: 'button1'}], touches: [] };
			newUserInput(rawData, undefined, save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			beforePhysicsFrame(16, currentState);
			expect(model.mouseClickEvent.firstCall.args).toEqual([currentState, {force: 1, key: 'button1'}, {timestamp: undefined, playerId: 3, delta: 16}]);
			expect(model.mouseDownEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when mouse input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { keys: [], mouse: {x: 6, y: 7 }};
			newUserInput(rawData, undefined, save, playerId);

			model.waiting.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			beforePhysicsFrame(16, currentState);
			expect(model.waiting.called).toBe(false);
		});
	});

	describe('when stick input is received', function () {
		beforeEach(function() {
			rawData = {
				'left-stick': {x: 0.1, y: 1.0},
				'right-stick': {x: 0.9, y: 0.3}
			};
			newUserInput(rawData, Date.now(), save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should call any matching functions with direction vector and the fource', function () {
			beforePhysicsFrame(16, currentState);
			expect(model.leftStickEvent.firstCall.args).toEqual([currentState, {x: 0.1, y: 1.0}, {timestamp: Date.now(), playerId: 3, delta: 16}]);
			expect(model.rightStickEvent.firstCall.args).toEqual([currentState, {x: 0.9, y: 0.3}, {timestamp: Date.now(), playerId: 3, delta: 16}]);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			fakeLogger.debug.reset();
			beforePhysicsFrame(16, currentState);
			expect(fakeLogger.debug.firstCall.args).toEqual([{key: 'left-stick'}, 'ActionMap called']);
			expect(fakeLogger.debug.secondCall.args).toEqual([{key: 'right-stick'}, 'ActionMap called']);
		});
	});

	describe('when stick input is received but not bound', function () {
		beforeEach(function() {
			require('../../../src/input/client/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()));
			beforePhysicsFrame = plugin.deps().BeforePhysicsFrame(defer(inputQueue));
			rawData = {
				'left-stick': {x: 0.1, y: 1.0, force: 0.5},
				'right-stick': {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, Date.now(), save, playerId);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call any matching functions with direction vector and the fource', function () {
			beforePhysicsFrame(16, currentState);
			expect(model.leftStickEvent.called).toEqual(false);
			expect(model.rightStickEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});

	describe('when stick input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = {
				'left-stick': {x: 0.1, y: 1.0, force: 0.5},
				'right-stick': {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, undefined, save, playerId);

			model.waiting.reset();
		});


		it('should not call actions without the "whenWaiting" flag', function () {
			beforePhysicsFrame(16, currentState);
			expect(model.waiting.called).toBe(false);
		});
	});
});