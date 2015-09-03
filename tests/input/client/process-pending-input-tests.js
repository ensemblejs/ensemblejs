'use strict';

var sinon = require('sinon');
var expect = require('expect');

var defer = require('../../support').defer;
var plugin = require('../../support').plugin();
var logger = require('../../support').logger;

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
	rightStickEvent: sinon.spy()
};

var currentState;
function stateCallback () {
	return currentState;
}

var currentState = require('../../support').gameScopedState(stateCallback);

var actions = [];
var rawData = {};
var onPhysicsFrame;
var mutator = sinon.spy();
var game = {
	id: 1,
	mode: 'arcade'
};

var queue = [];
var inputQueue = {
	length: function () { return queue.length; },
	get: function(i) { return queue[i]; }
};
function newUserInput (rawData, timestamp, game) {
	queue.push({
		rawData: rawData,
		timestamp: timestamp,
		game: game
	});
}

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

		mutator.reset();

		actions = [['*'], {
			'key': [
				{target: model.keyEvent, noEventKey: 'model'},
				{target: model.keyPressEvent, onRelease: true, noEventKey: 'model'},
				{target: model.keyModCtrl, noEventKey: 'model', modifiers: ['ctrl']},
				{target: model.keyPressModCtrl, onRelease: true, noEventKey: 'model', modifiers: ['ctrl']},
			],
			'button1': [
				{target: model.mouseDownEvent, noEventKey: 'model'},
				{target: model.mouseClickEvent, onRelease: true, noEventKey: 'model'}
			],
			'touch0': [{target: model.touchEvent, noEventKey: 'model'}],
			'cursor': [{target: model.cursorEvent, noEventKey: 'model'}],
			'nothing': [{target: model.noEvent, noEventKey: 'model'}],
			'leftStick': [{target: model.leftStickEvent, noEventKey: 'model'}],
			'rightStick': [{target: model.rightStickEvent, noEventKey: 'model'}],
		}];

		require('../../../src/input/client/process_pending_input').func(defer([actions]), defer(plugin.define), defer(mutator));
		onPhysicsFrame = plugin.deps().OnPhysicsFrame(defer(inputQueue));
	});

	afterEach(function () {
		clock.restore();
	});

	describe('when no input has been received', function() {
		beforeEach(function() {
			rawData = { keys: [], touches: [] };
			newUserInput(rawData, undefined, game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should call the "noEvent" on the "model" bound as "nothing"', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.noEvent.called).toBe(true);
			expect(mutator.called).toBe(true);
		});

		it('should pass in the standard event data', function () {
			onPhysicsFrame(currentState, 16);
			var expected = {timestamp: undefined, delta: 16};

			expect(model.noEvent.firstCall.args[0]).toEqual(currentState);
			expect(model.noEvent.firstCall.args[1]).toEqual(expected);
		});

		describe('when the action map has not been configured for "nothing"', function() {
			beforeEach(function() {
				require('../../../src/input/client/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(logger));
				onPhysicsFrame = plugin.deps().OnPhysicsFrame(defer(inputQueue));

				mutator.reset();
			});

			it ('should do nothing', function() {
				onPhysicsFrame(currentState, 16);
				expect(model.noEvent.called).toBe(false);
				expect(mutator.called).toBe(false);
			});
		});
	});

	describe('when key input is received', function() {
		beforeEach(function() {
			rawData = { keys: [{key: 'key'}], touches: [] };
			newUserInput(rawData, undefined, game);

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
			onPhysicsFrame(currentState, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.keyEvent.firstCall.args).toEqual([currentState, {timestamp: undefined, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should ignore the key case', function () {
			onPhysicsFrame(currentState, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { keys: [{key: 'KEY'}], touches: [] };
			newUserInput(rawData, undefined, game);
			onPhysicsFrame(currentState, 16);

			expect(model.keyEvent.firstCall.args).toEqual([currentState, {timestamp: undefined, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should not call bindings w/ modifiers if no modifier pressed', function () {

			onPhysicsFrame(currentState, 16);

			expect(model.keyEvent.firstCall.args).toEqual([currentState, {timestamp: undefined, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should only call bindings w/ modifiers if modifier pressed', function () {
			onPhysicsFrame(currentState, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			mutator.reset();

			queue = [];

			rawData = { keys: [{key: 'key', modifiers: ['ctrl']}], touches: [] };
			newUserInput(rawData, undefined, game);
			onPhysicsFrame(currentState, 16);

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
			newUserInput(rawData, undefined, game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.keyPressEvent.firstCall.args).toEqual([currentState, {timestamp: undefined, delta: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should ignore the key case', function () {
			onPhysicsFrame(currentState, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { singlePressKeys: [{key: 'KEY'}], touches: [] };
			newUserInput(rawData, undefined, game);
			onPhysicsFrame(currentState, 16);

			expect(model.keyPressEvent.firstCall.args).toEqual([currentState, {timestamp: undefined, delta: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should not call bindings w/ modifiers if no modifier pressed', function () {
			onPhysicsFrame(currentState, 16);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.firstCall.args).toEqual([currentState, {timestamp: undefined, delta: 16}]);
			expect(model.keyModCtrl.called).toBe(false);
			expect(model.keyPressModCtrl.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should only call bindings w/ modifiers if modifier pressed', function () {
			onPhysicsFrame(currentState, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			model.keyModCtrl.reset();
			model.keyPressModCtrl.reset();
			mutator.reset();

			queue = [];

			rawData = { singlePressKeys: [{key: 'key', modifiers: ['ctrl']}], touches: [] };
			newUserInput(rawData, undefined, game);
			onPhysicsFrame(currentState, 16);

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
			newUserInput(rawData, undefined, game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should do nothing if there are no events bound to that key', function () {
			onPhysicsFrame(currentState, 16);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when touch input is received', function() {
		beforeEach(function() {
			rawData = { touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.touchEvent.firstCall.args).toEqual([currentState, 4, 5, {timestamp: undefined, delta: 16}]);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when touch is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { keys: [{key: 'key'}], touches: [{id: 1, x: 4, y: 5}] };
			newUserInput(rawData, undefined, game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should do nothing if there are no events bound to touch', function () {
			onPhysicsFrame(currentState, 16);

			expect(model.touchEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when mouse input is received', function() {
		beforeEach(function() {
			rawData = { keys: [], mouse: {x: 6, y: 7 }};
			newUserInput(rawData, undefined, game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.cursorEvent.firstCall.args).toEqual([currentState, 6,7, {timestamp: undefined, delta: 16}]);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when mouse input is received but not bound', function() {
		beforeEach(function() {
			rawData = { x: 6, y: 7 };
			require('../../../src/input/client/process_pending_input').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()), defer(logger));
			onPhysicsFrame = plugin.deps().OnPhysicsFrame(defer(inputQueue));
			newUserInput(rawData, undefined, game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call any matching functions with the touch coordinates', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.cursorEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});

	describe('when mouse input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { singlePressKeys: [{key: 'button1'}], touches: [] };
			newUserInput(rawData, undefined, game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			onPhysicsFrame(currentState, 16);
			expect(model.mouseClickEvent.firstCall.args).toEqual([currentState, {timestamp: undefined, delta: 16}]);
			expect(model.mouseDownEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when stick input is received', function () {
		beforeEach(function() {
			rawData = {
				leftStick: {x: 0.1, y: 1.0, force: 0.5},
				rightStick: {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, Date.now(), game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should call any matching functions with direction vector and the fource', function () {
			onPhysicsFrame(currentState, 16);
			expect(model.leftStickEvent.firstCall.args).toEqual([currentState, 0.1, 1.0, 0.5, {timestamp: Date.now(), delta: 16}]);
			expect(model.rightStickEvent.firstCall.args).toEqual([currentState, 0.9, 0.3, 1.0, {timestamp: Date.now(), delta: 16}]);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when stick input is received but not bound', function () {
		beforeEach(function() {
			require('../../../src/input/client/process_pending_input.js').func(defer([['*'], {}]), defer(plugin.define), defer(sinon.spy()));
			onPhysicsFrame = plugin.deps().OnPhysicsFrame(defer(inputQueue));
			rawData = {
				leftStick: {x: 0.1, y: 1.0, force: 0.5},
				rightStick: {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, Date.now(), game);
		});

		afterEach(function () {
			queue = [];
		});

		it('should not call any matching functions with direction vector and the fource', function () {
			onPhysicsFrame(currentState, 16);
			expect(model.leftStickEvent.called).toEqual(false);
			expect(model.rightStickEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});
});