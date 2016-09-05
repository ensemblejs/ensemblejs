'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var reject = require('lodash').reject;
var last = require('lodash').last;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

var parseKeysAndKeypresses = require('../../util/input-common').parseKeysAndKeypresses;
var parseMouse = require('../../util/input-common').parseMouse;
var parseTouches = require('../../util/input-common').parseTouches;
var parseSticks = require('../../util/input-common').parseSticks;

var logger = require('../../logging/server/logger').logger;
import read from 'ok-selector';

module.exports = {
	type: 'ProcessPendingInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator'],
	func: function Server (actionMaps, define, mutate) {
		var userInput = [];
		var lowestInputProcessed = {};

		define()('BeforePhysicsFrame', function ProcessPendingInputServer () {

			return function processPendingInput (Δ, state) {
				var currentInput;
				var somethingHasReceivedInput;
				var data;
				var waitingForPlayers = read(state, 'ensemble.waitingForPlayers');

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
					var actionMap = last(actionMapDefinition);

					var suitableActions = reject(actionMap.nothing, 'ack');
					if (waitingForPlayers) {
						suitableActions = filter(suitableActions, 'whenWaiting');
					}

					each(suitableActions, function (action) {
						if (somethingHasReceivedInput.indexOf(action.noEventKey) === -1) {
							logger.debug({key: 'nothing'}, 'ActionMap called');

							return mutate()(
								currentInput.save.id,
								action.call(state, {}, data)
							);
						}

						return undefined;
					});
				}

				function createOnMatchingCallback (callback) {
					return function onMatchingActionMap (input, key, action, inputData) {
						if (action.ack) {
							return;
						}

						logger.debug({key: key}, 'ActionMap called');

						mutate()(
							input.save.id,
							callback(action.call, action.noEventKey, inputData)
						);
					};
				}

				var lengthOfInputStackAtStart = userInput.length;
				for (var i = 0; i < lengthOfInputStackAtStart; i += 1) {
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

					var forMode = filterPluginsByMode(actionMaps(), currentInput.save.mode);
					each(forMode, runNoInputHandlers);

					lowestInputProcessed[currentInput.save.id] = currentInput.rawData.clientFrame;
				}
			};
		});

		define()('LowestInputProcessed', function LowestInputProcessed () {
			return function getFor (saveId) {
				return lowestInputProcessed[saveId] || 0;
			};
		});

		define()('InternalState', function () {
			return {
				OnInput: {
					queueLength: function () { return userInput.length; }
				}
			};
		});

		define()('OnInput', function ProcessPendingInput () {
			return function handle(packet, timestamp, save) {
				userInput.push({
					rawData: packet,
					playerId: packet.playerId,
					timestamp: timestamp,
					save: save
				});
			};
		});
	}
};