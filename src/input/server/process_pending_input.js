'use strict';

var each = require('lodash').each;
var select = require('lodash').select;
var reject = require('lodash').reject;
var last = require('lodash').last;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

var parseKeysAndKeypresses = require('../../util/input-common').parseKeysAndKeypresses;
var parseMouse = require('../../util/input-common').parseMouse;
var parseTouches = require('../../util/input-common').parseTouches;
var parseSticks = require('../../util/input-common').parseSticks;

module.exports = {
	type: 'ProcessPendingInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator', 'Logger'],
	func: function(actionMaps, define, mutate, logger) {
		var userInput = [];
		var lowestInputProcessed = {};

		define()('BeforePhysicsFrame', function () {

			return function processPendingInput (state, delta) {
				var currentInput;
				var somethingHasReceivedInput;
				var data;
				var waitingForPlayers = state.get('ensemble.waitingForPlayers');

				function keyAndKeypressCallback(target, noEventKey) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, data);
				}

				function touchCallback(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, inputData.x, inputData.y, data);
				}

				function stickCallback(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, inputData.x, inputData.y, inputData.force, data);
				}

				function mouseCallback(target, noEventKey, inputData) {
					return target(state, inputData.x, inputData.y, data);
				}

				function runNoInputHandlers(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					var suitableActions = actionMap.nothing;
					if (waitingForPlayers) {
						suitableActions = select(suitableActions, { whenWaiting: true });
					}

					suitableActions = reject(suitableActions, 'ack');

					each(suitableActions, function(action) {
						if (somethingHasReceivedInput.indexOf(action.noEventKey) === -1) {
							logger().debug('ActionMap "nothing" with key: "' + action.noEventKey + '" called');

							return mutate()(
								currentInput.game.id,
								action.call(state, data)
							);
						}
					});
				}

				function createOnMatchingCallback (callback) {
					return function onMatchingActionMap (currentInput, key, action, inputData) {

						if (action.ack) {
							return;
						}

						logger().debug('ActionMap "' + key + '" called');

						mutate()(
				      currentInput.game.id,
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
						delta: delta
					};

					parseKeysAndKeypresses(actionMaps(), currentInput, waitingForPlayers, createOnMatchingCallback(keyAndKeypressCallback));
					parseTouches(actionMaps(), currentInput, waitingForPlayers, createOnMatchingCallback(touchCallback));
					parseSticks(actionMaps(), currentInput, waitingForPlayers, createOnMatchingCallback(stickCallback));
					parseMouse(actionMaps(), currentInput, waitingForPlayers, createOnMatchingCallback(mouseCallback));

					var forMode = filterPluginsByMode(actionMaps(), currentInput.game.mode);
					each(forMode, runNoInputHandlers);

					lowestInputProcessed[currentInput.game.id] = currentInput.rawData.id;
				}

				if (userInput.length > lengthOfInputStackAtStart) {
					logger().warn('More input was received than processed.');
				}
			};
		});

		define()('LowestInputProcessed', function LowestInputProcessed () {
			return function getFor (gameId) {
				return lowestInputProcessed[gameId];
			};
		});

		define()('InternalState', function () {
			return {
				OnInput: {
					queueLength: function () { return userInput.length; },
				}
			};
		});

		define()('OnInput', function ProcessPendingInput () {
			return function handle(rawData, timestamp, game) {
				userInput.push({
					rawData: rawData,
					playerId: rawData.playerId,
					timestamp: timestamp,
					game: game
				});
			};
		});
	}
};