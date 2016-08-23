'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;
var defer = require('../../support').defer;
import {read} from '../../../src/util/dot-string-support';
const Immutable = require('immutable');

var the = name => state => read(state, name);

let stateToReturn;
var rawStateAccess = {
	get: () => stateToReturn,
	resetTo: (newState) => (stateToReturn = Immutable.fromJS(newState))
};

function forceCurrentRawState (newState) {
	stateToReturn = Immutable.fromJS(newState);
}

sinon.spy(rawStateAccess, 'get');
sinon.spy(rawStateAccess, 'resetTo');

describe('StateTracker on the client', function () {
	let updateState = sinon.spy();
	let detectChangesAndNotifyObservers = sinon.spy();
	let currentValue = sinon.spy();
	let afterPhysicsFrame;
	let onSeedInitialState;
	let currentState;

	beforeEach(function () {

		let module = makeTestible('state/client/tracker', {}, {
			'../src/util/state-change-events-immutable': () => ({
				updateState, detectChangesAndNotifyObservers, currentValue
			})
		});

		onSeedInitialState = module[1].OnSeedInitialState(defer(rawStateAccess));
		afterPhysicsFrame = module[1].AfterPhysicsFrame(defer(rawStateAccess));
		currentState = module[1].CurrentState();
	});

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