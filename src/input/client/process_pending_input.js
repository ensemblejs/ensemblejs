'use strict';

const last = require('lodash').last;
const includes = require('lodash').includes;
const filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

const parseKeysAndKeypresses = require('../../util/input-common').parseKeysAndKeypresses;
const parseMouse = require('../../util/input-common').parseMouse;
const parseTouches = require('../../util/input-common').parseTouches;
const parseSticks = require('../../util/input-common').parseSticks;
import read from 'ok-selector';
import { wrap } from '../../util/breakdown-profiler';
import { logger } from '../../';

module.exports = {
	type: 'ProcessPendingInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator'],
	func: function Client (actionMaps, define, mutate) {

		define()('BeforePhysicsFrame', ['InputQueue'], function ProcessPendingInputClient (inputQueue) {

			function processPendingInput (Δ, state) {
				let currentInput;
				let somethingHasReceivedInput;
				let data;
				const waitingForPlayers = read(state, 'ensemble.waitingForPlayers');

				function keyAndKeypressCallback(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, inputData, data);
				}

				function touchCallback(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, {x: inputData.x, y: inputData.y}, data);
				}

				function stickCallback(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, {x: inputData.x, y: inputData.y}, data);
				}

				function mouseCallback(target, noEventKey, inputData) {
					return target(state, {x: inputData.x, y: inputData.y}, data);
				}

				function runNoInputHandlers(actionMapDefinition) {
					const actionMap = last(actionMapDefinition);
					if (!actionMap.nothing) {
						return;
					}

					const boom = (cb) => cb(state, {}, data);

					const length = actionMap.nothing.length;
					for (let i = 0; i < length; i+= 1) {
						const action = actionMap.nothing[i];
						if (waitingForPlayers && !action.whenWaiting) {
							return;
						}
						if (includes(somethingHasReceivedInput, action.noEventKey)) {
							return;
						}

						logger().debug({key: 'nothing'}, 'ActionMap called');

						mutate()(
							currentInput.save.id,
							action.call.forEach(boom)
						);
					}
				}

				function createOnMatchingCallback (callback) {
					return function invokeCallbackAndMutate (input, key, action, inputData) {

						if (action.ack) {
							return;
						}

						logger().debug({key}, 'ActionMap called');

						mutate()(
							input.save.id,
							action.call.forEach((cb) => callback(cb, action.noEventKey, inputData))
						);
					};
				}

				const onMatchingKeyAndKeypressCallback = createOnMatchingCallback(keyAndKeypressCallback);
				const onMatchingTouchCallback = createOnMatchingCallback(touchCallback);
				const onMatchingStickCallback = createOnMatchingCallback(stickCallback);
				const onMatchingMouseCallback = createOnMatchingCallback(mouseCallback);

				const lengthOfInputStackAtStart = inputQueue().length();
				for (let i = 0; i < lengthOfInputStackAtStart; i += 1) {
					currentInput = inputQueue().get(i);
					if (currentInput === undefined) {
						continue;
					}

					somethingHasReceivedInput = [];
					data = {
						timestamp: currentInput.timestamp,
						playerId: currentInput.playerId,
						Δ
					};

					parseKeysAndKeypresses(actionMaps(), currentInput, waitingForPlayers, onMatchingKeyAndKeypressCallback);

					parseTouches(actionMaps(), currentInput, waitingForPlayers, onMatchingTouchCallback);

					parseSticks(actionMaps(), currentInput, waitingForPlayers, onMatchingStickCallback);

					parseMouse(actionMaps(), currentInput, waitingForPlayers, onMatchingMouseCallback);

					const forMode = filterPluginsByMode(actionMaps(), currentInput.save.mode);
					for (let j = 0; j < forMode.length; j += 1) {
						runNoInputHandlers(forMode[j]);
					}
				}
			}

			return wrap(processPendingInput);
		});
	}
};