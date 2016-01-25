'use strict';

var last = require('lodash').last;
var contains = require('lodash').contains;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

var parseKeysAndKeypresses = require('../../util/input-common').parseKeysAndKeypresses;
var parseMouse = require('../../util/input-common').parseMouse;
var parseTouches = require('../../util/input-common').parseTouches;
var parseSticks = require('../../util/input-common').parseSticks;

module.exports = {
	type: 'ProcessPendingInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator', 'Logger'],
	func: function Client (actionMaps, define, mutate, logger) {

		define()('InternalState', ['InputQueue'], function (inputQueue) {
			return {
				OnInputClient: {
					queueLength: function () { return inputQueue().length(); },
				}
			};
		});

		var keys;
		var touches;
		var stick;
		var mouse;
		var noInput;
		define()('OnClientReady', ['Profiler'], function (profiler) {
			return function setupProfiling () {
				keys = profiler().timer('ensemblejs', 'BeforePhysicsFrame', 'ProcessPendingInput.keys', 1);
				touches = profiler().timer('ensemblejs', 'BeforePhysicsFrame', 'ProcessPendingInput.touches', 1);
				stick = profiler().timer('ensemblejs', 'BeforePhysicsFrame', 'ProcessPendingInput.stick', 1);
				mouse = profiler().timer('ensemblejs', 'BeforePhysicsFrame', 'ProcessPendingInput.mouse', 1);
				noInput = profiler().timer('ensemblejs', 'BeforePhysicsFrame', 'ProcessPendingInput.noInput', 1);
			};
		});

		define()('BeforePhysicsFrame', ['InputQueue'], function ProcessPendingInputClient (inputQueue) {

			return function processPendingInput (state, delta) {
				var currentInput;
				var somethingHasReceivedInput;
				var data;
				var waitingForPlayers = state.get('ensemble.waitingForPlayers');

				function keyAndKeypressCallback(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, inputData.force, data);
				}

				function touchCallback(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, inputData.x, inputData.y, data);
				}

				function stickCallback(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, inputData.x, inputData.y, data);
				}

				function mouseCallback(target, noEventKey, inputData) {
					return target(state, inputData.x, inputData.y, data);
				}

				function runNoInputHandlers(actionMapDefinition) {
					const actionMap = last(actionMapDefinition);
					if (!actionMap.nothing) {
						return;
					}

					const length = actionMap.nothing.length;
					for (let i = 0; i < length; i+= 1) {
						const action = actionMap.nothing[i];
						if (waitingForPlayers && !action.whenWaiting) {
							return;
						}
						if (contains(somethingHasReceivedInput, action.noEventKey)) {
							return;
						}

						logger().debug({action: action}, 'ActionMap called');

						mutate()(
							currentInput.save.id,
							action.call(state, data)
						);
					}
				}

				function createOnMatchingCallback (callback) {
					return function invokeCallbackAndMutate (currentInput, key, action, inputData) {

						if (action.ack) {
							return;
						}

						logger().debug({key: key}, 'ActionMap called');

						mutate()(
				      currentInput.save.id,
				      callback(action.call, action.noEventKey, inputData)
				    );
					};
				}

				var onMatchingKeyAndKeypressCallback = createOnMatchingCallback(keyAndKeypressCallback);
				var onMatchingTouchCallback = createOnMatchingCallback(touchCallback);
				var onMatchingStickCallback = createOnMatchingCallback(stickCallback);
				var onMatchingMouseCallback = createOnMatchingCallback(mouseCallback);

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

					keys.fromHere();
					parseKeysAndKeypresses(actionMaps(), currentInput, waitingForPlayers, onMatchingKeyAndKeypressCallback);
					keys.toHere();

					touches.fromHere();
					parseTouches(actionMaps(), currentInput, waitingForPlayers, onMatchingTouchCallback);
					touches.toHere();

					stick.fromHere();
					parseSticks(actionMaps(), currentInput, waitingForPlayers, onMatchingStickCallback);
					stick.toHere();

					mouse.fromHere();
					parseMouse(actionMaps(), currentInput, waitingForPlayers, onMatchingMouseCallback);
					mouse.toHere();

					noInput.fromHere();
					let forMode = filterPluginsByMode(actionMaps(), currentInput.save.mode);
					for (let i = 0; i < forMode.length; i += 1) {
						runNoInputHandlers(forMode[i]);
					}
					noInput.toHere();

					// currentInput.postState =
				}
			};
		});
	}
};