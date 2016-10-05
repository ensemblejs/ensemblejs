'use strict';

const sinon = require('sinon');
const expect = require('expect');

const defer = require('../../support').defer;
const plugin = require('../../support').plugin();

const model = {
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

const state = {
	ensemble: {
		waitingForPlayers: true
	}
};

let actions = [];
let rawData = {};
let newUserInput;
let update;
const mutator = sinon.spy();
const save = {
	id: 1,
	arcade: 'arcade'
};
const playerId = 2;

const logger = require('../../../src/logging/server/logger').logger;

describe('Input Bindings, ServerSide', function() {
	let clock;

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
			'left-stick': [
				{call: model.leftStickEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.waiting, noEventKey: 'model'},
				{ack: 'dont-crash', whenWaiting: true}
			],
			'right-stick': [
				{call: model.rightStickEvent, noEventKey: 'model', whenWaiting: true},
				{call: model.waiting, noEventKey: 'model'},
				{ack: 'dont-crash', whenWaiting: true}
			]
		}];

		require('../../../src/input/server/process_pending_input.js').func(defer([actions]), defer(plugin.define), defer(mutator));
		const deps = plugin.deps();
		newUserInput = deps.OnInput();
		update = deps.BeforePhysicsFrame();

		sinon.spy(logger, 'debug');
	});

	afterEach(function () {
		logger.debug.restore();

		clock.restore();
	});

	describe('when no input has been received', function() {
		beforeEach(function() {
			rawData = { playerId, keys: [], touches: [] };
			newUserInput(rawData, save);
		});

		it('should call the "noEvent" on the "model" bound as "nothing"', function() {
			update(16, state);
			expect(model.noEvent.called).toBe(true);
			expect(mutator.called).toBe(true);
		});

		it('should log a info message', function() {
			logger.debug.reset();
			update(16, state);
			expect(logger.debug.firstCall.args).toEqual([{key: 'nothing'}, 'ActionMap called']);
		});

		it('should pass in the standard event data', function () {
			update(16, state);
			const expected = {timestamp: undefined, playerId: 2, Δ: 16};

			expect(model.noEvent.firstCall.args[0]).toEqual(state);
			expect(model.noEvent.firstCall.args[1]).toEqual({});
			expect(model.noEvent.firstCall.args[2]).toEqual(expected);
		});

		describe('when no input is received while waiting for players', function () {
			beforeEach(function() {
				rawData = { playerId, keys: [], touches: [] };
				newUserInput(rawData, save);

				model.waiting.reset();
			});

			it('should not call actions without the "whenWaiting" flag', function () {
				update(16, state);
				expect(model.waiting.called).toBe(false);
			});
		});

		describe('when the action map has not been configured for "nothing"', function() {
			beforeEach(function() {
				require('../../../src/input/server/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(logger));

				const deps = plugin.deps();
				newUserInput = deps.OnInput();
				update = deps.BeforePhysicsFrame();

				mutator.reset();
			});

			it ('should do nothing', function() {
				update(16, state);
				expect(model.noEvent.called).toBe(false);
				expect(mutator.called).toBe(false);
			});
		});
	});

	describe('when key input is received', function() {
		beforeEach(function() {
			rawData = { playerId, keys: [{key: 'key'}], touches: [] };
			newUserInput(rawData, save);

			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			model.keyPressModCtrl.reset();
			mutator.reset();
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(16, state);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(16, state);
			expect(model.keyEvent.firstCall.args).toEqual([state, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should log an info message', function() {
			logger.debug.reset();
			update(16, state);
			expect(logger.debug.firstCall.args).toEqual([{key: 'key'}, 'ActionMap called']);
		});

		it('should ignore the key case', function () {
			update(16, state);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { playerId, keys: [{key: 'KEY'}], touches: [] };
			newUserInput(rawData, save);
			update(16, state);

			expect(model.keyEvent.firstCall.args).toEqual([state, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should not call bindings w/ modifiers if no modifier pressed', function () {

			update(16, state);

			expect(model.keyEvent.firstCall.args).toEqual([state, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should only call bindings w/ modifiers if modifier pressed', function () {
			update(16, state);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			mutator.reset();

			rawData = { playerId, keys: [{key: 'key', modifiers: ['ctrl']}], touches: [] };
			newUserInput(rawData, save);
			update(16, state);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(true);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when key input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { playerId, singlePressKeys: [{key: 'key'}], touches: [] };
			newUserInput(rawData, save);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(16, state);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(16, state);
			expect(model.keyPressEvent.firstCall.args).toEqual([state, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should ignore the key case', function () {
			update(16, state);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { playerId, singlePressKeys: [{key: 'KEY'}], touches: [] };
			newUserInput(rawData, save);
			update(16, state);

			expect(model.keyPressEvent.firstCall.args).toEqual([state, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should not call bindings w/ modifiers if no modifier pressed', function () {
			update(16, state);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.firstCall.args).toEqual([state, {force: 1, key: 'key'}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should only call bindings w/ modifiers if modifier pressed', function () {
			update(16, state);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			model.keyPressModCtrl.reset();
			mutator.reset();

			rawData = { playerId, singlePressKeys: [{key: 'key', modifiers: ['ctrl']}], touches: [] };
			newUserInput(rawData, save);
			update(16, state);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(true);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when key input is received but not bound', function () {
		beforeEach(function() {
			rawData = { playerId, keys: [{key: 'notBound'}], singlePressKeys: [{key: 'notBound'}], touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, save);
		});

		it('should do nothing if there are no events bound to that key', function () {
			update(16, state);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when key input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { playerId, keys: [{key: 'key'}, {key: 'not-waiting'}] };
			newUserInput(rawData, save);

			model.waiting.reset();
			model.keyEvent.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			update(16, state);
			expect(model.waiting.called).toBe(false);
		});

		it('should call actions with the "whenWaiting" flag', function () {
			update(16, state);
			expect(model.keyEvent.called).toBe(true);
		});
	});

	describe('when touch input is received', function() {
		beforeEach(function() {
			rawData = { playerId, touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, save);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(16, state);
			expect(model.noEvent.called).toBe(false);
		});

		it('should log an info message', function() {
			logger.debug.reset();
			update(16, state);
			expect(logger.debug.firstCall.args).toEqual([{key: 'touch0'}, 'ActionMap called']);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			update(16, state);
			expect(model.touchEvent.firstCall.args).toEqual([state, {x: 4, y: 5}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when touch is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { playerId, keys: [{key: 'key'}], touches: [{id: 1, x: 4, y: 5}] };
			newUserInput(rawData, save);
		});

		it('should do nothing if there are no events bound to touch', function () {
			update(16, state);

			expect(model.touchEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when touch input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { playerId, touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, save);

			model.waiting.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			update(16, state);
			expect(model.waiting.called).toBe(false);
		});
	});

	describe('when mouse cursor input is received', function() {
		beforeEach(function() {
			rawData = { playerId, keys: [], mouse: {x: 6, y: 7 }};
			newUserInput(rawData, save);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			update(16, state);
			expect(model.cursorEvent.firstCall.args).toEqual([state, {x: 6, y: 7}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(mutator.called).toBe(true);
		});

		it('should log an info message', function() {
			logger.debug.reset();
			update(16, state);
			expect(logger.debug.firstCall.args).toEqual([{key: 'cursor'}, 'ActionMap called']);
		});
	});

	describe('when mouse input is received but not bound', function() {
		beforeEach(function() {
			rawData = { x: 6, y: 7, playerId };
			require('../../../src/input/server/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(logger));

			newUserInput = plugin.deps().OnInput();
			newUserInput(rawData, save);
		});

		it('should not call any matching functions with the touch coordinates', function() {
			update(16, state);
			expect(model.cursorEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});

	describe('when mouse input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { playerId, singlePressKeys: [{key: 'button1'}], touches: [] };
			newUserInput(rawData, save);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(16, state);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(16, state);
			expect(model.mouseClickEvent.firstCall.args).toEqual([state, {force: 1, key: 'button1'}, {timestamp: undefined, playerId: 2, Δ: 16}]);
			expect(model.mouseDownEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when mouse cursor input is received while waiting for players', function () {

		beforeEach(function() {
			rawData = { playerId, keys: [], mouse: {x: 6, y: 7 } };
			newUserInput(rawData, save);

			model.waiting.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			update(16, state);
			expect(model.waiting.called).toBe(false);
		});
	});

	describe('when stick input is received', function () {
		beforeEach(function() {
			rawData = {
				playerId,
				timestamp: Date.now(),
				'left-stick': {x: 0.1, y: 1.0},
				'right-stick': {x: 0.9, y: 0.3}
			};
			newUserInput(rawData, save, playerId);
		});

		it('should call any matching functions with direction vector and the fource', function () {
			update(16, state);
			expect(model.leftStickEvent.firstCall.args).toEqual([state, {x: 0.1, y: 1.0}, {timestamp: Date.now(), playerId: 2, Δ: 16}]);
			expect(model.rightStickEvent.firstCall.args).toEqual([state, {x: 0.9, y: 0.3}, {timestamp: Date.now(), playerId: 2, Δ: 16}]);
			expect(mutator.called).toBe(true);
		});

		it('should log an info message', function() {
			logger.debug.reset();
			update(16, state);
			expect(logger.debug.firstCall.args).toEqual([{key: 'left-stick'}, 'ActionMap called']);
			expect(logger.debug.secondCall.args).toEqual([{key: 'right-stick'}, 'ActionMap called']);
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
			newUserInput(rawData, save, playerId);
		});

		it('should not call any matching functions with direction vector and the fource', function () {
			update(16, state);
			expect(model.leftStickEvent.called).toEqual(false);
			expect(model.rightStickEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});

	describe('when stick input is received while waiting for players', function () {
		beforeEach(function() {
			rawData = {
				playerId,
				leftStick: {x: 0.1, y: 1.0, force: 0.5},
				rightStick: {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, save);

			model.waiting.reset();
		});

		it('should not call actions without the "whenWaiting" flag', function () {
			update(16, state);
			expect(model.waiting.called).toBe(false);
		});
	});
});