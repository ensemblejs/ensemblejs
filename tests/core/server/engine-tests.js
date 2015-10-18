'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;

var update1 = [['*'], sinon.spy()];
var update2 = [['custom'], sinon.spy()];
var values = {
	paused: false,
	waitingForPlayers: false
};
var state = {
	for: function () {
		return {
			for: function () {
				return {
					get: function (key) { return values[key]; }
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
	server: {
		physicsUpdateLoop: 15
	}
};
var fakeTime = require('../../fake/time').at(0);

describe('the engine', function() {
	var onServerStart;
	var onServerStop;
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
		onServerStart = sut[0];
		onServerStop = sut[1].OnServerStop;
	});

	afterEach(function() {
		onServerStop();
	});

	describe('when unpaused', function() {
		afterEach(function () {
			onServerStop();
		});

		it('should call each function passed in with the delta in ms', function() {
			fakeTime.present = function () { return 5000; };
			interval = onServerStart();
			expect(update1[1].firstCall.args[1]).toEqual(5);
			expect(update2[1].firstCall.args[1]).toEqual(5);
		});

		it('should not increase the delta whilst the game is paused', function () {
			values.paused = true;
			interval = onServerStart();
			onServerStop();

			fakeTime.present = function () { return 5000; };
			interval = onServerStart();
			onServerStop();

			fakeTime.present = function () { return 10000; };
			interval = onServerStart();
			onServerStop();

			update1[1].reset();
			values.paused = false;
			fakeTime.present = function () { return 10100; };
			onServerStart();
			expect(update1[1].firstCall.args[1]).toEqual(0.1);
		});

		describe('update functions for all games', function() {
			beforeEach(function() {
				update1[1].reset();
				onServerStop();
			});

			afterEach(function () {
				onServerStop();
			});

			it('should only be for every game', function () {
				interval = onServerStart();

				expect(update1[1].callCount).toEqual(3);
			});
		});

		describe('update functions for specific modes', function() {
			beforeEach(function() {
				update2[1].reset();
				onServerStop();
			});

			afterEach(function () {
				onServerStop();
			});

			it('should only be called when the modes match', function() {
				interval = onServerStart();

				expect(update2[1].callCount).toEqual(1);
			});
		});
	});

	describe('when paused', function() {
		afterEach(function () {
			onServerStop();
		});

		it('it should not call any update functions', function() {
			values.paused = true;
			interval = onServerStart(1);
			expect(update1[1].called).toBe(false);
		});
	});
});