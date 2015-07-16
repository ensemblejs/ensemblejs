'use strict';

var sinon = require('sinon');
var expect = require('expect');

var deferDep = require('../helpers.js').deferDep;
var definePlugin = require('../helpers.js').definePlugin;
var getDefinedPlugin = require('../helpers.js').getDefinedPlugin;


var model = {
	noEvent: sinon.spy(),
	keyEvent: sinon.spy(),
	keyPressEvent: sinon.spy(),
	mouseDownEvent: sinon.spy(),
	mouseClickEvent: sinon.spy(),
	touchEvent: sinon.spy(),
	cursorEvent: sinon.spy(),
	leftStickEvent: sinon.spy(),
	rightStickEvent: sinon.spy()
};

var state = {a: 'b'};

var actions = [];
var rawData = {};
var newUserInput;
var update;
var mutator = sinon.spy();
var gameId = 1;
var mode = 'arcade';

var logger = {
	info: sinon.spy(),
	warn: sinon.spy()
};

describe('Input Bindings', function() {
	var clock;

	beforeEach(function() {
		clock = sinon.useFakeTimers();

		model.noEvent.reset();
		model.keyEvent.reset();
		model.keyPressEvent.reset();
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
				{target: model.keyPressEvent, onRelease: true, noEventKey: 'model'}
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

		newUserInput = require('../../src/input/input_handler.js').func(deferDep([actions]), deferDep(definePlugin), deferDep(mutator), deferDep(logger));
		update = getDefinedPlugin('ServerSideUpdate');
	});

	afterEach(function () {
		clock.restore();
	});

	describe('when no input has been received', function() {
		beforeEach(function() {
			rawData = { keys: [], touches: [] };
			newUserInput(rawData, undefined, gameId, mode);
		});

		it('should call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(true);
			expect(mutator.called).toBe(true);
		});

		it('should pass in the standard event data', function () {
			update(state, 16);
			var expected = {rcvdTimestamp: undefined, delta: 16};

			expect(model.noEvent.firstCall.args[0]).toEqual(state);
			expect(model.noEvent.firstCall.args[1]).toEqual(expected);
		});

		describe('when the action map has not been configured for "nothing"', function() {
			beforeEach(function() {
				newUserInput = require('../../src/input/input_handler.js').func(deferDep([['*'], {}]), deferDep(definePlugin), deferDep(sinon.spy()), deferDep(logger));
				update = getDefinedPlugin('ServerSideUpdate');

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
			rawData = { keys: ['key'], touches: [] };
			newUserInput(rawData, undefined, gameId, mode);

			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(state, 16);
			expect(model.keyEvent.firstCall.args).toEqual([state, {rcvdTimestamp: undefined, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should ignore the key case', function () {
			update(state, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { keys: ['KEY'], touches: [] };
			newUserInput(rawData, undefined, gameId, mode);
			update(state, 16);

			expect(model.keyEvent.firstCall.args).toEqual([state, {rcvdTimestamp: undefined, delta: 16}]);
			expect(model.keyPressEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when key input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { singlePressKeys: ['key'], touches: [] };
			newUserInput(rawData, undefined, gameId, mode);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(state, 16);
			expect(model.keyPressEvent.firstCall.args).toEqual([state, {rcvdTimestamp: undefined, delta: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});

		it('should ignore the key case', function () {
			update(state, 16);
			model.keyEvent.reset();
			model.keyPressEvent.reset();
			mutator.reset();

			rawData = { singlePressKeys: ['KEY'], touches: [] };
			newUserInput(rawData, undefined, gameId, mode);
			update(state, 16);

			expect(model.keyPressEvent.firstCall.args).toEqual([state, {rcvdTimestamp: undefined, delta: 16}]);
			expect(model.keyEvent.called).toBe(false);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when key input is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { keys: ['notBound'], singlePressKeys: ['notBound'], touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, gameId, mode);
		});

		it('should do nothing if there are no events bound to that key', function () {
			update(state, 16);

			expect(model.keyEvent.called).toBe(false);
			expect(model.keyPressEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when touch input is received', function() {
		beforeEach(function() {
			rawData = { touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData, undefined, gameId, mode);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			update(state, 16);
			expect(model.touchEvent.firstCall.args).toEqual([state, 4, 5, {rcvdTimestamp: undefined, delta: 16}]);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when touch is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { keys: ['key'], touches: [{id: 1, x: 4, y: 5}] };
			newUserInput(rawData, undefined, gameId, mode);
		});

		it('should do nothing if there are no events bound to touch', function () {
			update(state, 16);

			expect(model.touchEvent.called).toBe(false);
			expect(model.noEvent.called).toBe(false);
		});
	});

	describe('when mouse input is received', function() {
		beforeEach(function() {
			rawData = { keys: [], mouse: {x: 6, y: 7 }};
			newUserInput(rawData, undefined, gameId, mode);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			update(state, 16);
			expect(model.cursorEvent.firstCall.args).toEqual([state, 6,7, {rcvdTimestamp: undefined, delta: 16}]);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when mouse input is received but not bound', function() {
		beforeEach(function() {
			rawData = { x: 6, y: 7 };
			newUserInput = require('../../src/input/input_handler.js').func(deferDep([['*'], {}]), deferDep(definePlugin), deferDep(sinon.spy()), deferDep(logger));
			newUserInput(rawData, undefined, gameId, mode);
		});

		it('should not call any matching functions with the touch coordinates', function() {
			update(state, 16);
			expect(model.cursorEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});

	describe('when mouse input is received as onRelease', function() {
		beforeEach(function() {
			rawData = { singlePressKeys: ['button1'], touches: [] };
			newUserInput(rawData, undefined, gameId, mode);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update(state, 16);
			expect(model.noEvent.called).toBe(false);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update(state, 16);
			expect(model.mouseClickEvent.firstCall.args).toEqual([state, {rcvdTimestamp: undefined, delta: 16}]);
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
			newUserInput(rawData, Date.now());
		});

		it('should call any matching functions with direction vector and the fource', function () {
			update(state, 16);
			expect(model.leftStickEvent.firstCall.args).toEqual([state, 0.1, 1.0, 0.5, {rcvdTimestamp: Date.now(), delta: 16}]);
			expect(model.rightStickEvent.firstCall.args).toEqual([state, 0.9, 0.3, 1.0, {rcvdTimestamp: Date.now(), delta: 16}]);
			expect(mutator.called).toBe(true);
		});
	});

	describe('when stick input is received but not bound', function () {
		beforeEach(function() {
			newUserInput = require('../../src/input/input_handler.js').func(deferDep([['*'], {}]), deferDep(definePlugin), deferDep(sinon.spy()), deferDep(logger));
			rawData = {
				leftStick: {x: 0.1, y: 1.0, force: 0.5},
				rightStick: {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, Date.now());
		});

		it('should not call any matching functions with direction vector and the fource', function () {
			update(state, 16);
			expect(model.leftStickEvent.called).toEqual(false);
			expect(model.rightStickEvent.called).toEqual(false);
			expect(mutator.called).toBe(false);
		});
	});
});