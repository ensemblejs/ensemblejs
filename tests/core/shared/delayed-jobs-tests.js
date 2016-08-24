'use strict';

var sinon = require('sinon');
var expect = require('expect');
var makeTestible = require('../../support').makeTestible;
var DynamicPluginLoader = require('../../support').DynamicPluginLoader;

var effect1 = sinon.spy();
var effect2 = sinon.spy();
var sut = makeTestible('core/shared/delayed-jobs', {
	DynamicPluginLoader: new DynamicPluginLoader({
		'Plugin1': { method: effect1 },
		'Plugin2': { callback: effect2}
	})
});
var manager = sut[0];
var onPhysicsFrame = sut[1].OnPhysicsFrame();
const currentState = {
	getIn: () => []
};

describe('the delayed job manager', function() {
	beforeEach(function() {
		effect1.reset();
		effect2.reset();

		manager.add('key1', 0.5, 'Plugin1', 'method');
		manager.add('key2', 1, 'Plugin2', 'callback');
	});

	it('should allow you to add multiple effects', function() {
		onPhysicsFrame(0.5, currentState);

		expect(effect1.called).toEqual(true);
	});

	it('should remove finished effects from the jobs list', function() {
		var newState = onPhysicsFrame(0.5, currentState);

		expect(newState).toEqual(['ensemble.jobs', [{
			key: 'key2',
			duration: 0.5,
			plugin: 'Plugin2',
			method: 'callback'
		}]]);
	});

	it('should be possible to cancel all effects of a certain key', function () {
		manager.cancelAll('key1');
		onPhysicsFrame(1, currentState);

		expect(effect1.called).toEqual(false);
		expect(effect2.called).toEqual(true);
	});
});