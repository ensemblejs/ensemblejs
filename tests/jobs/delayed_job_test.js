'use strict';

var sinon = require('sinon');
var assert = require('assert');

describe('a delayed effect', function() {
	var delayedEffect;
	var effect = sinon.spy();

	beforeEach(function() {
		delayedEffect = require('../../src/jobs/delayed_job')('key', 5, effect);
		effect.reset();
	});

	it('should call the function once the duration has passed', function() {
		delayedEffect.tick(5);
		assert(effect.called);
	});

	it('should only call the function once', function() {
		delayedEffect.tick(5);
		assert(effect.called);
		delayedEffect.tick(1);
		assert(effect.called);
	});

	it('should be cancelable', function() {
		delayedEffect.tick(1);
		assert(!effect.called);
		delayedEffect.cancel();
		delayedEffect.tick(1);
		assert(!effect.called);
	});

	it('should know if it is still alive', function() {
		delayedEffect.tick(1);
		assert(delayedEffect.isAlive());
		delayedEffect.tick(4);
		assert(!delayedEffect.isAlive());
	});
});