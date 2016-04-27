'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;

var currentState;
function stateCallback () {
	return currentState;
}

var state = require('../../support').gameScopedState(stateCallback);

var effect1 = sinon.spy();
var effect2 = sinon.spy();
var sut = makeTestible('core/shared/delayed-jobs');
var manager = sut[0];
var onPhysicsFrame = sut[1].OnPhysicsFrame();
currentState = {
	'ensemble.jobs': []
};

describe('the delayed job manager', function() {
	beforeEach(function() {
		effect1.reset();
		effect2.reset();

		manager.add('key1', 0.5, effect1);
		manager.add('key2', 1, effect2);
	});

	it('should allow you to add multiple effects', function() {
		onPhysicsFrame(0.5, state);

		expect(effect1.called).toEqual(true);
	});

	it('should remove finished effects from the jobs list', function() {
		var newState = onPhysicsFrame(0.5, state);

		expect(newState).toEqual(['ensemble.jobs', [{
			key: 'key2',
			duration: 0.5,
			callback: effect2
		}]]);
	});

	it('should be possible to cancel all effects of a certain key', function () {
		manager.cancelAll('key1');
		onPhysicsFrame(1, state);

		expect(effect1.called).toEqual(false);
		expect(effect2.called).toEqual(true);
	});
});