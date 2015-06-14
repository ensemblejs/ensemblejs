'use strict';

var sinon = require('sinon');
var expect = require('expect');
var state = {a: 'b'};
var gameId = 3;

describe('a delayed effect', function() {
	var delayedEffect;
	var effect = sinon.spy();

	beforeEach(function() {
		delayedEffect = require('../../src/jobs/delayed_job')('key', 5, effect);
		effect.reset();
	});

	it('should call the function once the duration has passed', function() {
		delayedEffect.tick(state, 5, gameId);
		expect(effect.called).toEqual(true);
	});

	it('should pass state and gameId to the onComplete function', function() {
		delayedEffect.tick(state, 5, gameId);
		expect(effect.firstCall.args).toEqual([state, gameId]);
	});

	it('should only call the function once', function() {
		delayedEffect.tick(state, 5, gameId);
		expect(effect.called).toEqual(true);
		delayedEffect.tick(state, 1, gameId);
		expect(effect.called).toEqual(true);
	});

	it('should be cancelable', function() {
		delayedEffect.tick(state, 1, gameId);
		expect(!effect.called).toEqual(true);
		delayedEffect.cancel();
		delayedEffect.tick(state, 1, gameId);
		expect(!effect.called).toEqual(true);
	});

	it('should know if it is still alive', function() {
		delayedEffect.tick(state, 1, gameId);
		expect(delayedEffect.isAlive()).toEqual(true);
		delayedEffect.tick(state, 4, gameId);
		expect(!delayedEffect.isAlive()).toEqual(true);
	});
});