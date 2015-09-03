'use strict';

var assert = require('assert');
var expect = require('expect');
var sinon = require('sinon');

var defer = require('../../support').defer;

var update1 = [['*'], sinon.spy()];
var update2 = [['custom'], sinon.spy()];
var paused = false;
var state = {
	for: function () {
		return {
			for: function () {
				return {
					get: function () { return paused; }
				};
			}
		};
	}
};
var gamesList = {
	all: function () {
		return [
			{id: 1, mode: '*'},
			{id: 2, mode: 'custom'},
			{id: 3, mode: 'other'}
		];
	}
};
var config = {
	server: {}
};

describe('the engine', function() {
	var engine;
	var clock;
	var interval;

	beforeEach(function() {
		update1[1].reset();
		update2[1].reset();

		clock = sinon.useFakeTimers();

		engine = require('../../../src/core/server/engine.js').func(defer([update1, update2]), defer(state), defer(sinon.spy()), defer(gamesList), defer(config));
	});

	afterEach(function() {
		clearInterval(interval);
		clock.restore();
	});

	describe('when unpaused', function() {
		it('should call each function passed in with the delta in ms', function() {
			clock.tick(5000);
			interval = engine.run(0.5);
			assert.deepEqual(update1[1].firstCall.args[1], 5);
			assert.deepEqual(update2[1].firstCall.args[1], 5);
		});

		it('should not increase the delta whilst the game is paused', function () {
			paused = true;
			interval = engine.run(1);
			clearInterval(interval);

			clock.tick(5000);
			interval = engine.run(1);
			clearInterval(interval);

			clock.tick(5000);
			interval = engine.run(1);
			clearInterval(interval);

			update1[1].reset();
			paused = false;
			clock.tick(100);
			interval = engine.run(1);
			assert.deepEqual(update1[1].firstCall.args[1], 0.1);
		});

		describe('update functions for all games', function() {
			it('should only be for every game', function () {
				interval = engine.run(0);

				expect(update1[1].callCount).toEqual(3);
			});
		});

		describe('update functions for specific modes', function() {
			it('should only be called when the modes match', function() {
				interval = engine.run(0);

				expect(update2[1].callCount).toEqual(1);
			});
		});
	});

	describe('when paused', function() {
		it('it should not call any update functions', function() {
			paused = true;
			interval = engine.run(1);
			assert(!update1[1].called);
		});
	});
});