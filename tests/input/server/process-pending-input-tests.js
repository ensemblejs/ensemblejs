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

var state = {
	a: 'b',
	get: function () {
		return true;
	}
};

var actions = [];
var rawData = {};
var newUserInput;
var update;
var mutator = sinon.spy();
var game = {
	id: 1,
	arcade: 'arcade'
};
var playerId = 2;

var logger = {
	filename: sinon.spy(),
	debug: sinon.spy(),
	info: sinon.spy(),
	warn: sinon.spy(),
	called: sinon.spy()
};

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
				{ack: 'dont-crash', whenWaiting: true}
			],
			'not-waiting': [{call: model.waiting, noEventKey: 'model'}],
			'button1': [
				{call: model.mouseDownEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.mouseClickEvent, onRelease: true, noEventKey: 'model', whenWaiting: true},
				{ack: 'dont-crash', whenWaiting: true}
			],
			'touch0': [
				{call: model.touchEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.waiting, noEventKey: 'model'},
				{ack: 'dont-crash', whenWaiting: true}
			],
			'cursor': [
				{call: model.cursorEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.waiting, noEventKey: 'model' },
				{ack: 'dont-crash', whenWaiting: true}
			],
			'nothing': [
				{call: model.noEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.waiting, noEventKey: 'model'},
				{ack: 'dont-crash', whenWaiting: true}
			],
			'leftStick': [
				{call: model.leftStickEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.waiting, noEventKey: 'model'},
				{ack: 'dont-crash', whenWaiting: true}
			],
			'rightStick': [
				{call: model.rightStickEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.waiting, noEventKey: 'model'},
				{ack: 'dont-crash', whenWaiting: true}
			]
		}];

		require('../../../src/input/server/process_pending_input.js').func(defer([actions]), defer(plugin.define), defer(mutator), defer(logger));
		newUserInput = plugin.deps().OnInput();
		update = plugin.deps().BeforePhysicsFrame();
	});

	afterEach(function () {
		clock.restore();
	});

	describe('when no input has been received', function() {
		beforeEach(function() {
			rawData = { playerId: playerId, keys: [], touches: [] };
			newUserInput(rawData, undefined, game);
		});

		it('should call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(true);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			logger.debug.reset();
			update(state, 16);
			expect(logger.debug.firstCall.args).toEqual(['ActionMap "nothing" with key: "model" called']);
		});

		it('should pass in the standard event data', function () {
			update(state, 16);
			var expected = {timestamp: undefined, playerId: 2, delta: 16};

			expect(model.noEvent.firstCall.args[0]).toEqual(state);
			expect(model.noEvent.firstCall.args[1]).toEqual(expected);
		});

		describe('when no input is received while waiting for players', function () {
			beforeEach(function() {
				rawData = { playerId: playerId, keys: [], touches: [] };
				newUserInput(rawData, undefined, game);

				model.waiting.reset();
			});

			it('should not call actions without the "whenWaiting" flag', function () {
				update(state, 16);
				expect(model.waiting.called).toBe(false);
			});
		});

		describe('when the action map has not been configured for "nothing"', function() {
			beforeEach(function() {
				require('../../../src/input/server/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(logger));

				newUserInput = plugin.deps().OnInput();
				update = plugin.deps().BeforePhysicsFrame();

				mutator.reset();
			});

			it ('should do nothing', function() {
				update(state, 16);
				expect(model.noEvent.called).toBe(false);
				expect(mutator.called).toBe(false);
			});
		});
	});

	describe('when key input is received', function() {
		beforeEach(function() {
			rawData = { playerId: playerId, keys: [{key: 'key'}], touches: [] };
			newUserInput(rawData, undefined, game);

			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			model.keyPressModCtrl.reset();
			mutator.reset();
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(state, 16);
			expect(model.keyEvent.firstCall.args).toEqual([state, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			logger.debug.reset();
			update(state, 16);
			expect(logger.debug.firstCall.args).toEqual(['ActionMap "key" called']);
		});

		it('should ignore the key case', function () {
			update(state, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { playerId: playerId, keys: [{key: 'KEY'}], touches: [] };
			newUserInput(rawData, undefined, game);
			update(state, 16);

			expect(model.keyEvent.firstCall.args).toEqual([state, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should not call bindings w/ modifiers if no modifier pressed', function () {

			update(state, 16);

			expect(model.keyEvent.firstCall.args).toEqual([state, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should only call bindings w/ modifiers if modifier pressed', function () {
			update(state, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			mutator.reset();

			rawData = { playerId: playerId, keys: [{key: 'key', modifiers: ['ctrl']}], touches: [] };
			newUserInput(rawData, undefined, game);
			update(state, 16);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(true);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when key input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { playerId: playerId, singlePressKeys: [{key: 'key'}], touches: [] };
			newUserInput(rawData, undefined, game);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(state, 16);
			expect(model.keyPressEvent.firstCall.args).toEqual([state, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should ignore the key case', function () {
			update(state, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { playerId: playerId, singlePressKeys: [{key: 'KEY'}], touches: [] };
			newUserInput(rawData, undefined, game);
			update(state, 16);

			expect(model.keyPressEvent.firstCall.args).toEqual([state, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should not call bindings w/ modifiers if no modifier pressed', function () {
			update(state, 16);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.firstCall.args).toEqual([state, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should only call bindings w/ modifiers if modifier pressed', function () {
			update(state, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			model.keyPressModCtrl.reset();
			mutator.reset();

			rawData = { playerId: playerId, singlePressKeys: [{key: 'key', modifiers: ['ctrl']}], touches: [] };
			newUserInput(rawData, undefined, game);
			update(state, 16);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(true);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when key input is received but not bound', function () {
		beforeEach(function() {
			rawData = { playerId: playerId, keys: [{key: 'notBound'}], singlePressKeys: [{key: 'notBound'}], touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, game);
		});

		it('should do nothing if there are no events bound to that key', function () {
			update(state, 16);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when key input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { playerId: playerId, keys: [{key: 'key'}, {key: 'not-waiting'}] };
			newUserInput(rawData, undefined, game);

			model.waiting.reset();
			model.keyEvent.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			update(state, 16);
			expect(model.waiting.called).toBe(false);
		});

		it('should call actions with the "whenWaiting" flag', function () {
			update(state, 16);
			expect(model.keyEvent.called).toBe(true);
		});
	});

	describe('when touch input is received', function() {
		beforeEach(function() {
			rawData = { playerId: playerId, touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, game);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should log a debug message', function() {
			logger.debug.reset();
			update(state, 16);
			expect(logger.debug.firstCall.args).toEqual(['ActionMap "touch0" called']);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			update(state, 16);
			expect(model.touchEvent.firstCall.args).toEqual([state, 4, 5, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when touch is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { playerId: playerId, keys: [{key: 'key'}], touches: [{id: 1, x: 4, y: 5}] };
			newUserInput(rawData, undefined, game);
		});

		it('should do nothing if there are no events bound to touch', function () {
			update(state, 16);

			expect(model.touchEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when touch input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { playerId: playerId, touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, game);

			model.waiting.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			update(state, 16);
			expect(model.waiting.called).toBe(false);
		});
	});

	describe('when mouse cursor input is received', function() {
		beforeEach(function() {
			rawData = { playerId: playerId, keys: [], mouse: {x: 6, y: 7 }};
			newUserInput(rawData, undefined, game);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			update(state, 16);
			expect(model.cursorEvent.firstCall.args).toEqual([state, 6,7, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			logger.debug.reset();
			update(state, 16);
			expect(logger.debug.firstCall.args).toEqual(['ActionMap "cursor" called']);
		});
	});

	describe('when mouse input is received but not bound', function() {
		beforeEach(function() {
			rawData = { x: 6, y: 7, playerId: playerId };
			require('../../../src/input/server/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(logger));

			newUserInput = plugin.deps().OnInput();
			newUserInput(rawData, undefined, game);
		});

		it('should not call any matching functions with the touch coordinates', function() {
			update(state, 16);
			expect(model.cursorEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});

	describe('when mouse input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { playerId: playerId, singlePressKeys: [{key: 'button1'}], touches: [] };
			newUserInput(rawData, undefined, game);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(state, 16);
			expect(model.mouseClickEvent.firstCall.args).toEqual([state, {timestamp: undefined, playerId: 2, delta: 16}]);
			expect(model.mouseDownEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when mouse cursor input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { playerId: playerId, keys: [], mouse: {x: 6, y: 7 } };
			newUserInput(rawData, undefined, game);

			model.waiting.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			update(state, 16);
			expect(model.waiting.called).toBe(false);
		});
	});

	describe('when stick input is received', function () {
		beforeEach(function() {
			rawData = {
				playerId: playerId,
				leftStick: {x: 0.1, y: 1.0, force: 0.5},
				rightStick: {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, Date.now(), game, playerId);
		});

		it('should call any matching functions with direction vector and the fource', function () {
			update(state, 16);
			expect(model.leftStickEvent.firstCall.args).toEqual([state, 0.1, 1.0, 0.5, {timestamp: Date.now(), playerId: 2, delta: 16}]);
			expect(model.rightStickEvent.firstCall.args).toEqual([state, 0.9, 0.3, 1.0, {timestamp: Date.now(), playerId: 2, delta: 16}]);
			expect(mutator.called).toBe(true);
		});

		it('should log a debug message', function() {
			logger.debug.reset();
			update(state, 16);
			expect(logger.debug.firstCall.args).toEqual(['ActionMap "leftStick" called']);
			expect(logger.debug.secondCall.args).toEqual(['ActionMap "rightStick" called']);
		});
	});

	describe('when stick input is received but not bound', function () {
		beforeEach(function() {
			require('../../../src/input/server/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(logger));

			newUserInput = plugin.deps().OnInput();

			rawData = {
				leftStick: {x: 0.1, y: 1.0, force: 0.5},
				rightStick: {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, Date.now(), game, playerId);
		});

		it('should not call any matching functions with direction vector and the fource', function () {
			update(state, 16);
			expect(model.leftStickEvent.called).toEqual(false);
			expect(model.rightStickEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});

	describe('when stick input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = {
				playerId: playerId,
				leftStick: {x: 0.1, y: 1.0, force: 0.5},
				rightStick: {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, undefined, game);

			model.waiting.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			update(state, 16);
			expect(model.waiting.called).toBe(false);
		});
	});
});