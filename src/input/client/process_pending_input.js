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
	type: 'ProcessPendingInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator', 'Logger'],
	func: function ProcessPendingInput (actionMaps, define, mutate, logger) {

		define()('BeforePhysicsFrame', ['InputQueue'], function ProcessPendingInput (inputQueue) {

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
					return function invokeCallbackAndMutate (currentInput, key, action, inputData) {

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

				var lengthOfInputStackAtStart = inputQueue().length();
				for (var i = 0; i < lengthOfInputStackAtStart; i += 1) {
					currentInput = inputQueue().get(i);
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
				}
			};
		});
	}
};