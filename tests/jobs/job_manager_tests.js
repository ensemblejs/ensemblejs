'use strict';

var sinon = require('sinon');
var expect = require('expect');

var deferDep = require('../helpers.js').deferDep;
var definePlugin = require('../helpers.js').definePlugin;
var getDefinedPlugin = require('../helpers.js').getDefinedPlugin;

var stateMutator = sinon.spy();
var manager = require('../../src/jobs/job_manager.js').func(deferDep(definePlugin), deferDep(stateMutator));
var update = getDefinedPlugin('ServerSideUpdate');

describe('the delayed effect manager', function() {
	var effect1 = sinon.spy();
	var effect2 = sinon.spy();

	beforeEach(function() {
		effect1.reset();
		effect2.reset();
	});

	it('should allow you to add multiple effects', function() {
		manager.add('key', 1, effect1);
		manager.add('key', 1, effect2);
		update({} ,1);
		expect(effect1.called).toEqual(true);
		expect(effect2.called).toEqual(true);
	});

	it('should update each effect', function() {
		manager.add('key', 1, effect1);
		manager.add('key', 1, effect2);
		update({}, 0.5);
		expect(effect1.called).toEqual(false);
		expect(effect2.called).toEqual(false);
		update({}, 1);
		expect(effect1.called).toEqual(true);
		expect(effect2.called).toEqual(true);
	});

	it('should not call dead effects', function() {
		manager.add('key', 1, effect1);
		manager.add('key', 1, effect2);
		update({}, 1);
		effect1.reset();
		effect2.reset();
		update({}, 1);
		expect(effect1.called).toEqual(false);
		expect(effect2.called).toEqual(false);
	});

	it('should be possible to cancel all effects', function() {
		manager.add('key1', 1, effect1);
		manager.add('key2', 1, effect2);
		manager.cancelAll();
		update({}, 1);
		expect(effect1.called).toEqual(false);
		expect(effect2.called).toEqual(false);
	});

	it('should be possible to cancel all effects of a certain key', function () {
		manager.add('key1', 1, effect1);
		manager.add('key2', 1, effect2);
		manager.cancelAll('key1');
		update({}, 1);
		expect(effect1.called).toEqual(false);
		expect(effect2.called).toEqual(true);
	});
});