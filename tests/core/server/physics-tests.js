'use strict';

const expect = require('expect');
const sinon = require('sinon');
const makeTestible = require('../../support').makeTestible;

const update1 = sinon.spy();
const update2 = sinon.spy();
const update3 = [['*'], sinon.spy()];
const update4 = [['custom'], sinon.spy()];
const values = {
	ensemble: {
		paused: false,
		waitingForPlayers: true
	}
};
const state = {
	for: () => ({
		all: () => values,
		get: (key) => {
			let prop = values;
			key.split('.').forEach((part) => (prop = prop[part]));
			return prop;
		}
	})
};
const savesList = {
	loaded: () => [
		{id: 1, mode: '*'},
		{id: 2, mode: 'custom'},
		{id: 3, mode: 'other'}
	]
};
const config = {
	server: {
		physicsUpdateLoop: 15
	}
};

const FixedDelta = 15;
let runEachSave = 0;

describe('the server physics engine', function() {
	beforeEach(function() {
		update1.reset();
		update2.reset();
		update3[1].reset();
		update4[1].reset();

		makeTestible('core/server/physics', {
			BeforePhysicsFrame: [update1, update2],
			OnPhysicsFrame: [update3, update4],
			AfterPhysicsFrame: [],
			SavesList: savesList,
			StateAccess: state
		}, {
			'fixed-setinterval': (f) => f(),
			'../src/util/config': {
				get: () => config
			},
			'game-loops': {
				createFixedTimeStep: (delta, isPaused, func) => (runEachSave = func)
			}
		});
	});

	describe('when unpaused', function() {
		it('should call BeforePhysicsFrame with the delta in ms', function() {
			runEachSave(FixedDelta);
			expect(update1.firstCall.args[0]).toEqual(FixedDelta);
			expect(update2.firstCall.args[0]).toEqual(FixedDelta);
		});

		describe('when waitingForPlayers', function () {
			beforeEach(function () {
				values.ensemble.waitingForPlayers = true;
				update3[1].reset();
				update4[1].reset();
				runEachSave(FixedDelta);
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
				runEachSave(FixedDelta);
			});

			it('should call OnPhysicsFrame', function() {
				expect(update3[1].called).toBe(true);
				expect(update4[1].called).toBe(true);

				expect(update3[1].firstCall.args[0]).toEqual(FixedDelta);
				expect(update4[1].firstCall.args[0]).toEqual(FixedDelta);
			});
		});

		describe('update functions for all saves', function() {
			beforeEach(function() {
				update1.reset();
				update3[1].reset();
			});

			it('should be for every save', function () {
				runEachSave(FixedDelta);

				expect(update1.callCount).toEqual(3);
				expect(update3[1].callCount).toEqual(3);
			});
		});

		describe('update functions for specific modes', function() {
			beforeEach(function() {
				update4[1].reset();
			});

			it('should only be called when the modes match', function() {
				runEachSave(FixedDelta);
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
			runEachSave(FixedDelta);
		});

		it('it should not call any update functions', function() {
			expect(update1.called).toBe(false);
			expect(update2.called).toBe(false);
			expect(update3[1].called).toBe(false);
			expect(update4[1].called).toBe(false);
		});
	});
});