'use strict';

var assert = require('assert');
var sinon = require('sinon');
var expect = require('expect');

var deferDep = require('../helpers.js').deferDep;
var definePlugin = require('../helpers.js').definePlugin;
var getDefinedPlugin = require('../helpers.js').getDefinedPlugin;


var model = {
	noEvent: sinon.spy(),
	keyEvent: sinon.spy(),
	keyPressEvent: sinon.spy(),
	touchEvent: sinon.spy(),
	cursorEvent: sinon.spy(),
	leftStickEvent: sinon.spy(),
	rightStickEvent: sinon.spy()
};

var actions = {};
var rawData = {};
var newUserInput;
var update;

describe('Input Bindings', function() {
	var clock;

	beforeEach(function() {
		clock = sinon.useFakeTimers();

		model.noEvent.reset();
		model.keyEvent.reset();
		model.keyPressEvent.reset();
		model.touchEvent.reset();
		model.cursorEvent.reset();
		model.leftStickEvent.reset();
		model.rightStickEvent.reset();

		actions = {
			'key': [
				{target: model.keyEvent, noEventKey: 'model'},
				{target: model.keyPressEvent, keypress: true, noEventKey: 'model'}
			],
			'touch0': [{target: model.touchEvent, noEventKey: 'model'}],
			'cursor': [{target: model.cursorEvent, noEventKey: 'model'}],
			'nothing': [{target: model.noEvent, noEventKey: 'model'}],
			'leftStick': [{target: model.leftStickEvent, noEventKey: 'model'}],
			'rightStick': [{target: model.rightStickEvent, noEventKey: 'model'}],
		};

		newUserInput = require('../../src/input/input_handler.js').func(deferDep(actions), deferDep(definePlugin), deferDep(sinon.spy()));
		update = getDefinedPlugin('ServerSideUpdate');
	});

	afterEach(function () {
		clock.restore();
	});

	describe('when no input has been received', function() {
		beforeEach(function() {
			rawData = { keys: [], touches: [] };
			newUserInput(rawData);
		});

		it('should call the "noEvent" on the "model" bound as "nothing"', function() {
			update();
			assert(model.noEvent.called);
		});

		it('should pass in the standard event data', function () {
			update();
			var expected = {rcvdTimestamp: undefined};

			expect(model.noEvent.firstCall.args[0]).toEqual(expected);
		});

		describe('when the action map has not been configured for "nothing"', function() {
			beforeEach(function() {
				newUserInput = require('../../src/input/input_handler.js').func(deferDep({}), deferDep(definePlugin), deferDep(sinon.spy()));
				update = getDefinedPlugin('ServerSideUpdate');
			});

			it ('should do nothing', function() {
				update();
				assert(!model.noEvent.called);
			});
		});
	});

	describe('when key input is received', function() {
		beforeEach(function() {
			rawData = { keys: ['key'], touches: [] };
			newUserInput(rawData);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update();
			assert(!model.noEvent.called);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update();
			expect(model.keyEvent.firstCall.args).toEqual([{rcvdTimestamp: undefined}]);
			assert(!model.keyPressEvent.called);
		});
	});

	describe('when key input is received as keypress', function() {
		beforeEach(function() {
			rawData = { singlePressKeys: ['key'], touches: [] };
			newUserInput(rawData);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update();
			assert(!model.noEvent.called);
		});

		it('should call any matching functions with a force of one, event data and supplied data', function() {
			update();
			expect(model.keyPressEvent.firstCall.args).toEqual([{rcvdTimestamp: undefined}]);
			assert(!model.keyEvent.called);
		});
	});

	describe('when key input is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { keys: ['notBound'], singlePressKeys: ['notBound'], touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData);
		});

		it('should do nothing if there are no events bound to that key', function () {
			update();

			assert(!model.keyEvent.called);
			assert(!model.keyPressEvent.called);
			assert(!model.noEvent.called);
		});
	});

	describe('when touch input is received', function() {
		beforeEach(function() {
			rawData = { touches: [{id: 0, x: 4, y: 5}] };
			newUserInput(rawData);
		});

		it('should not call the "noEvent" on the "model" bound as "nothing"', function() {
			update();
			assert(!model.noEvent.called);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			update();
			expect(model.touchEvent.firstCall.args).toEqual([4, 5, {rcvdTimestamp: undefined}]);
		});
	});

	describe('when touch is recieved but not bound', function () {
		beforeEach(function() {
			rawData = { keys: ['key'], touches: [{id: 1, x: 4, y: 5}] };
			newUserInput(rawData);
		});

		it('should do nothing if there are no events bound to that key', function () {
			update();

			assert(!model.touchEvent.called);
			assert(!model.noEvent.called);
		});
	});

	describe('when mouse input is received', function() {
		beforeEach(function() {
			rawData = { x: 6, y: 7 };
			newUserInput(rawData);
		});

		it('should call any matching functions with the touch coordinates, event data and supplied data', function() {
			update();
			expect(model.cursorEvent.firstCall.args).toEqual([6,7, {rcvdTimestamp: undefined}]);
		});
	});

	describe('when mouse input is received but not bound', function() {
		beforeEach(function() {
			rawData = { x: 6, y: 7 };
			newUserInput = require('../../src/input/input_handler.js').func(deferDep({}), deferDep(definePlugin), deferDep(sinon.spy()));
			newUserInput(rawData);
		});

		it('should not call any matching functions with the touch coordinates', function() {
			update();
			expect(model.cursorEvent.called).toEqual(false);
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
			update();
			expect(model.leftStickEvent.firstCall.args).toEqual([0.1, 1.0, 0.5, {rcvdTimestamp: Date.now()}]);
			expect(model.rightStickEvent.firstCall.args).toEqual([0.9, 0.3, 1.0, {rcvdTimestamp: Date.now()}]);
		});
	});

	describe('when stick input is received but not bound', function () {
		beforeEach(function() {
			newUserInput = require('../../src/input/input_handler.js').func(deferDep({}), deferDep(definePlugin), deferDep(sinon.spy()));
			rawData = {
				leftStick: {x: 0.1, y: 1.0, force: 0.5},
				rightStick: {x: 0.9, y: 0.3, force: 1.0}
			};
			newUserInput(rawData, Date.now());
		});

		it('should call any matching functions with direction vector and the fource', function () {
			update();
			expect(model.leftStickEvent.called).toEqual(false);
			expect(model.rightStickEvent.called).toEqual(false);
		});
	});
});