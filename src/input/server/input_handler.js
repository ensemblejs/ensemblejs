'use strict';

var each = require('lodash').each;
var select = require('lodash').select;
var last = require('lodash').last;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

var parseKeysAndKeypresses = require('../../util/input-common').parseKeysAndKeypresses;
var parseMouse = require('../../util/input-common').parseMouse;
var parseTouches = require('../../util/input-common').parseTouches;
var parseSticks = require('../../util/input-common').parseSticks;

module.exports = {
	type: 'OnInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator', 'Logger'],
	func: function(actionMaps, definePlugin, mutate, logger) {
		var userInput = [];
		var lowestInputProcessed = {};

		definePlugin()('OnPhysicsFrameAlways', function () {

			function ProcessPendingInput (state, delta) {
				var currentInput;
				var somethingHasReceivedInput;
				var data;
				var waitingForPlayers = state.for('ensemble').get('waitingForPlayers');

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

					each(suitableActions, function(action) {
						if (somethingHasReceivedInput.indexOf(action.noEventKey) === -1) {
							return mutate()(
								currentInput.game.id,
								action.target(state, data)
							);
						}
					});
				}

				function createOnMatchingCallback (callback) {
					return function onMatchingActionMap (currentInput, action, inputData) {
						mutate()(
				      currentInput.game.id,
				      callback(action.target, action.noEventKey, inputData)
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
					logger().warn('More input was received than we processed.');
				}
			}

 			return ProcessPendingInput;
		});

		definePlugin()('LowestInputProcessed', function LowestInputProcessed () {
			return function getFor (gameId) {
				return lowestInputProcessed[gameId];
			};
		});

		definePlugin()('InternalState', function () {
			return {
				OnInput: {
					queueLength: function () { return userInput.length; },
				}
			};
		});

		return function handle(rawData, timestamp, game) {
			userInput.push({
				rawData: rawData,
				playerId: rawData.playerId,
				timestamp: timestamp,
				game: game
			});
		};
	}
};