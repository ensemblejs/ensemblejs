'use strict';

var expect = require('expect');
var sinon = require('sinon');
var defer = require('../../support').defer;
var plugin = require('../../support').plugin();
var modulePath = '../../../src/state/client/tracker';
import {read} from '../../../src/util/dot-string-support';
const Immutable = require('immutable');

var the = name => state => read(state, name);

var rawStateAccess = {
	get: sinon.spy(),
	resetTo: sinon.spy()
};

function forceCurrentRawState (newState) {
	rawStateAccess.get = function () { return Immutable.fromJS(newState); };
}

var logger = require('../../fake/logger');

describe('StateTracker on the client', function () {
	var callback = sinon.spy();
	var callback2 = sinon.spy();
	var afterPhysicsFrame;
	var deps;

	beforeEach(function () {
		callback.reset();
		callback2.reset();
		plugin.reset();

		require(modulePath).func(defer(plugin.define), defer(logger));

		deps = plugin.deps();

		afterPhysicsFrame = deps.AfterPhysicsFrame(defer(rawStateAccess));
	});

	describe('on seed initial state', () => {
		it('should do things');
	});

	describe('after each physics frame', () => {
		it('should do things');
	});

	describe('getting the current value', function () {
		it('should return the current value', function() {
			forceCurrentRawState({property: 'unchanged'});
			afterPhysicsFrame();
			expect(deps.CurrentState().get(the('property'))).toEqual('unchanged');
		});
	});
});