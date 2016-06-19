'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;

var update1 = sinon.spy();
var update2 = sinon.spy();
var update3 = [['*'], sinon.spy()];
var update4 = [['custom'], sinon.spy()];
var values = {
	ensemble: {
		paused: false,
		waitingForPlayers: true
	}
};
var state = {
	for: function () {
		return {
			all: () => values,
			get: key => values[key]
		};
	}
};
var savesList = {
	loaded: function () {
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
var profiler = require('../../fake/profiler');

describe('the engine', function() {
	var onServerStart;
	var onServerStop;

	beforeEach(function() {
		update1.reset();
		update2.reset();
		update3[1].reset();
		update4[1].reset();

		var sut = makeTestible('core/server/physics', {
			BeforePhysicsFrame: [update1, update2],
			OnPhysicsFrame: [update3, update4],
			AfterPhysicsFrame: [],
			SavesList: savesList,
			Config: config,
			Time: fakeTime,
			StateAccess: state,
			Profiler: profiler
		});
		onServerStart = sut[0];
		onServerStop = sut[1].OnServerStop();
	});

	afterEach(function() {
		onServerStop();
	});

	describe('when unpaused', function() {
		it('should call OnPhysicsFrameA with the delta in ms', function() {
			fakeTime.present = function () { return 5000; };
			onServerStart();
			expect(update1.firstCall.args[0]).toEqual(5);
			expect(update2.firstCall.args[0]).toEqual(5);
			onServerStop();
		});

		describe('when waitingForPlayers', function () {
			beforeEach(function () {
				values.ensemble.waitingForPlayers = true;
				update3[1].reset();
				update4[1].reset();
				fakeTime.present = function () { return 5000; };
				onServerStart();
			});

			afterEach(function () {
				onServerStop();
			});

			it('should not call OnPhysicsFrameB', function() {
				expect(update3[1].called).toBe(false);
				expect(update4[1].called).toBe(false);
			});
		});

		describe('when not waitingForPlayers', function () {
			beforeEach(function () {
				values.ensemble.waitingForPlayers = false;
				update3[1].reset();
				update4[1].reset();
				fakeTime.present = function () { return 10000; };
				onServerStart();
			});

			afterEach(function () {
				onServerStop();
			});

			it('should call OnPhysicsFrameB', function() {
				expect(update3[1].called).toBe(true);
				expect(update4[1].called).toBe(true);

				expect(update3[1].firstCall.args[0]).toEqual(5);
				expect(update4[1].firstCall.args[0]).toEqual(5);
			});
		});

		it('should not increase the delta whilst the save is paused', function () {
			values.ensemble.paused = true;
			onServerStart();
			onServerStop();

			fakeTime.present = function () { return 5000; };
			onServerStart();
			onServerStop();

			fakeTime.present = function () { return 10000; };
			onServerStart();
			onServerStop();

			update1.reset();
			values.ensemble.paused = false;
			fakeTime.present = function () { return 10100; };
			onServerStart();
			expect(update1.firstCall.args[0]).toEqual(0.1);
			onServerStop();
		});

		describe('update functions for all saves', function() {
			beforeEach(function() {
				update1.reset();
				update3[1].reset();
				onServerStop();
			});

			afterEach(function () {
				onServerStop();
			});

			it('should only be for every save', function () {
				onServerStart();

				expect(update1.callCount).toEqual(3);
				expect(update3[1].callCount).toEqual(3);
			});
		});

		describe('update functions for specific modes', function() {
			beforeEach(function() {
				update4[1].reset();
				onServerStop();
			});

			afterEach(function () {
				onServerStop();
			});

			it('should only be called when the modes match', function() {
				onServerStart();

				expect(update4[1].callCount).toEqual(1);
			});
		});
	});

	describe('when paused', function() {
		beforeEach(function () {
			update1.reset();
			update2.reset();
			update3[1].reset();
			update4[1].reset();

			values.ensemble.paused = true;
			onServerStart(1);
		});

		afterEach(function () {
			onServerStop();
		});

		it('it should not call any update functions', function() {
			expect(update1.called).toBe(false);
			expect(update2.called).toBe(false);
			expect(update3[1].called).toBe(false);
			expect(update4[1].called).toBe(false);
		});
	});
});