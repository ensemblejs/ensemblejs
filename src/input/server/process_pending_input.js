'use strict';

import last from 'lodash/last';

const filterPluginsByMode = require('../../util/modes').filterPluginsByMode;
const parseKeysAndKeypresses = require('../../util/input-common').parseKeysAndKeypresses;
const parseMouse = require('../../util/input-common').parseMouse;
const parseTouches = require('../../util/input-common').parseTouches;
const parseSticks = require('../../util/input-common').parseSticks;
const logger = require('../../logging/server/logger').logger;

import read from 'ok-selector';
import { update as updateTrackingDeviceInputReceived } from '../../util/tracking-device-input-received';

module.exports = {
	type: 'ProcessPendingInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator'],
	func: function Server (actionMaps, define, mutate) {
		const userInput = [];

		define()('BeforePhysicsFrame', function ProcessPendingInputServer () {

			return function processPendingInput (Δ, state) {
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

					let suitableActions = actionMap.nothing.filter((action) => !action.ack);
					if (waitingForPlayers) {
						suitableActions = suitableActions.filter((action) => action.whenWaiting);
					}

					suitableActions.forEach((action) => {
						if (somethingHasReceivedInput.indexOf(action.noEventKey) !== -1) {
							return;
						}

						logger.debug({key: 'nothing'}, 'ActionMap called');

						action.call.forEach((cb) => {
							return mutate()(
								currentInput.save.id,
								cb(state, {}, data)
							);
						});
					});
				}

				function createOnMatchingCallback (callback) {
					return function onMatchingActionMap (input, key, action, inputData) {
						if (action.ack) {
							return;
						}

						logger.debug({ key }, 'ActionMap called');

						action.call.forEach((cb) => {
							mutate()(
								input.save.id,
								callback(cb, action.noEventKey, inputData)
							);
						});
					};
				}

				const lengthOfInputStackAtStart = userInput.length;
				for (let i = 0; i < lengthOfInputStackAtStart; i += 1) {
					currentInput = userInput.shift();
					if (currentInput === undefined) {
						return;
					}

					somethingHasReceivedInput = [];
					data = {
						timestamp: currentInput.timestamp,
						playerId: currentInput.playerId,
						Δ
					};

					parseKeysAndKeypresses(actionMaps(), currentInput, waitingForPlayers, createOnMatchingCallback(keyAndKeypressCallback));
					parseTouches(actionMaps(), currentInput, waitingForPlayers, createOnMatchingCallback(touchCallback));
					parseSticks(actionMaps(), currentInput, waitingForPlayers, createOnMatchingCallback(stickCallback));
					parseMouse(actionMaps(), currentInput, waitingForPlayers, createOnMatchingCallback(mouseCallback));

					const forMode = filterPluginsByMode(actionMaps(), currentInput.save.mode);
					forMode.forEach(runNoInputHandlers);

					updateTrackingDeviceInputReceived(
						currentInput.save.id,
						currentInput.playerId,
						currentInput.deviceNumber,
						currentInput.rawData.id,
						currentInput.rawData.clientFrame
					);
				}
			};
		});

		define()('OnInput', function ProcessPendingInput () {
			return function handle(packet, save) {
				userInput.push({
					rawData: packet,
					playerId: packet.playerId,
					deviceNumber: packet.deviceNumber,
					timestamp: packet.timestamp,
					save
				});
			};
		});
	}
};