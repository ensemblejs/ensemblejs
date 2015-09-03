'use strict';

var assert = require('assert');
var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;

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
var fakeTime = require('../../fake/time').at(0);

describe('the engine', function() {
	var onStart;
	var interval;

	beforeEach(function() {
		update1[1].reset();
		update2[1].reset();

		var sut = makeTestible('core/server/engine', {
			OnPhysicsFrame: [update1, update2],
			GamesList: gamesList,
			Config: config,
			Time: fakeTime,
			StateAccess: state
		});
		onStart = sut[0];
	});

	afterEach(function() {
		clearInterval(interval);
	});

	describe('when unpaused', function() {
		it('should call each function passed in with the delta in ms', function() {
			fakeTime.present = function () { return 5000; };
			interval = onStart();
			assert.deepEqual(update1[1].firstCall.args[1], 5);
			assert.deepEqual(update2[1].firstCall.args[1], 5);
		});

		it('should not increase the delta whilst the game is paused', function () {
			paused = true;
			interval = onStart();
			clearInterval(interval);

			fakeTime.present = function () { return 5000; };
			interval = onStart();
			clearInterval(interval);

			fakeTime.present = function () { return 10000; };
			interval = onStart();
			clearInterval(interval);

			update1[1].reset();
			paused = false;
			fakeTime.present = function () { return 10100; };
			onStart();
			assert.deepEqual(update1[1].firstCall.args[1], 0.1);
		});

		describe('update functions for all games', function() {
			beforeEach(function() {
				update1[1].reset();
				clearInterval(interval);
			});

			it('should only be for every game', function () {
				interval = onStart();

				expect(update1[1].callCount).toEqual(3);
			});
		});

		describe('update functions for specific modes', function() {
			beforeEach(function() {
				update2[1].reset();
				clearInterval(interval);
			});

			it('should only be called when the modes match', function() {
				interval = onStart();

				expect(update2[1].callCount).toEqual(1);
			});
		});
	});

	describe('when paused', function() {
		it('it should not call any update functions', function() {
			paused = true;
			interval = onStart(1);
			assert(!update1[1].called);
		});
	});
});