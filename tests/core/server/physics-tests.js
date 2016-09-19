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
			all: () => ({
				getIn: () => values.ensemble.waitingForPlayers
			}),
			get: key => {
				let prop = values;
				key.split('.').forEach(part => (prop = prop[part]));
				return prop;
			}
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

const FixedDelta = 16.6666666666;

describe('the server physics engine', function() {
	var onServerStart;

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
		}, {
			'fixed-setinterval': f => f()
		});

		onServerStart = sut[0];
	});

	describe('when unpaused', function() {
		describe('the behaviour of a fixed-timestep loop', () => {
			it('should have behaviour');
		});

		it('should call BeforePhysicsFrame with the delta in ms', function() {
			fakeTime.precise = function () { return 5000; };
			onServerStart();
			expect(update1.firstCall.args[0]).toEqual(FixedDelta);
			expect(update2.firstCall.args[0]).toEqual(FixedDelta);
		});

		describe('when waitingForPlayers', function () {
			beforeEach(function () {
				values.ensemble.waitingForPlayers = true;
				update3[1].reset();
				update4[1].reset();
				fakeTime.precise = function () { return 5000; };
				onServerStart();
			});

			it('should not call OnPhysicsFrame', function() {
				expect(update3[1].called).toBe(false);
				expect(update4[1].called).toBe(false);
			});
		});

		describe('when not waitingForPlayers', function () {
			beforeEach(function () {
				values.ensemble.waitingForPlayers = false;
				update3[1].reset();
				update4[1].reset();
				fakeTime.precise = function () { return 10000; };
				onServerStart();
			});

			it('should call OnPhysicsFrame', function() {
				expect(update3[1].called).toBe(true);
				expect(update4[1].called).toBe(true);

				expect(update3[1].firstCall.args[0]).toEqual(FixedDelta);
				expect(update4[1].firstCall.args[0]).toEqual(FixedDelta);
			});
		});

		it('should not increase the delta whilst the save is paused', function () {
			values.ensemble.paused = true;
			onServerStart();

			fakeTime.precise = function () { return 5000; };
			onServerStart();

			fakeTime.precise = function () { return 10000; };
			onServerStart();

			update1.reset();
			values.ensemble.paused = false;
			fakeTime.precise = function () { return 10100; };
			onServerStart();
			expect(update1.firstCall.args[0]).toEqual(FixedDelta);
		});

		describe('update functions for all saves', function() {
			beforeEach(function() {
				update1.reset();
				update3[1].reset();
				fakeTime.precise = function () { return 10017; };
			});

			it('should be for every save', function () {
				onServerStart();

				expect(update1.callCount).toEqual(3);
				expect(update3[1].callCount).toEqual(3);
			});
		});

		describe('update functions for specific modes', function() {
			beforeEach(function() {
				fakeTime.precise = function () { return 10034; };
				update4[1].reset();
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

		it('it should not call any update functions', function() {
			expect(update1.called).toBe(false);
			expect(update2.called).toBe(false);
			expect(update3[1].called).toBe(false);
			expect(update4[1].called).toBe(false);
		});
	});
});