'use strict';

const expect = require('expect');
const sinon = require('sinon');
const requirePlugin = require('../../support').requirePlugin;
const defer = require('../../support').defer;
const capture = require('../../support').capture();
import {read} from '../../../src/util/dot-string-support';
const Immutable = require('immutable');

const the = (name) => (state) => read(state, name);

let stateToReturn;
const rawStateAccess = {
	get: () => ({
		all: () => stateToReturn
	}),
	resetTo: (newState) => (stateToReturn = Immutable.fromJS(newState))
};

function forceCurrentRawState (newState) {
	stateToReturn = Immutable.fromJS(newState);
}

sinon.spy(rawStateAccess, 'get');
sinon.spy(rawStateAccess, 'resetTo');

const updateState = sinon.spy();
const detectChangesAndNotifyObservers = sinon.spy();
const currentValue = sinon.spy();

requirePlugin('state/client/tracker', {}, {
	'../src/util/state-change-events-immutable': () => ({
		updateState, detectChangesAndNotifyObservers, currentValue
	}),
	'../src/': capture.define
});

const onSeedInitialState = capture.deps().OnSeedInitialState(defer(rawStateAccess));
const afterPhysicsFrame = capture.deps().AfterPhysicsFrame(defer(rawStateAccess));
const currentState = capture.deps().CurrentState();

describe('StateTracker on the client', function () {
	describe('on seed initial state', () => {
		beforeEach(() => {
			rawStateAccess.resetTo.reset();
			updateState.reset();

			onSeedInitialState({seed: 'state'});
		});

		it('sets the raw state to the initial state', () => {
			expect(rawStateAccess.resetTo.firstCall.args).toEqual([Immutable.fromJS({
				seed: 'state'
			})]);
		});

		it('updates the tracker state', () => {
			expect(updateState.firstCall.args).toEqual([Immutable.fromJS({
				seed: 'state'
			})]);
		});
	});

	describe('after each physics frame', () => {
		beforeEach(() => {
			updateState.reset();
			detectChangesAndNotifyObservers.reset();

			forceCurrentRawState({latest: 'and-greatest'});

			afterPhysicsFrame();
		});

		it('updates the tracker state', () => {
			expect(updateState.firstCall.args).toEqual([Immutable.fromJS({
				latest: 'and-greatest'
			})]);
		});

		it('detects changes and notifies observers', () => {
			expect(detectChangesAndNotifyObservers.callCount).toEqual(1);
		});
	});

	describe('getting the current value', function () {
		it('should return the current value', function() {
			currentState.get(the('property'));

			expect(currentValue.firstCall.args).toEqual([the('property')]);
		});
	});
});