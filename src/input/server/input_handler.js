'use strict';

var each = require('lodash').each;
var select = require('lodash').select;
var reject = require('lodash').reject;
var intersection = require('lodash').intersection;
var first = require('lodash').first;
var last = require('lodash').last;
var xor = require('lodash').xor;
var map = require('lodash').map;

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

function ensureMapHasModifiers(action) {
	action.modifiers = action.modifiers || [];
	return action;
}

module.exports = {
	type: 'OnInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator', 'Logger'],
	func: function(actionMaps, definePlugin, stateMutator, logger) {
		var userInput = [];
		var lowestInputProcessed = {};

		function parseKeysAndKeypresses (currentInput, callback) {
			logger().called(arguments, 'ensemblejs', 'OnInput', parseKeysAndKeypresses);

			function withMode (actionMap) {
				return isApplicable(currentInput.mode, actionMap);
			}

      function invokeCallback(action) {
      	logger().called(arguments, 'ensemblejs', 'OnInput', invokeCallback);

				stateMutator()(
					currentInput.gameId,
					callback(action.target, action.noEventKey)
				);
			}

			var amWithMode = select(actionMaps(), withMode);

			function processKeys (keyData, rejectOrSelect) {
				logger().called(arguments, 'ensemblejs', 'OnInput', processKeys);

				each(keyData, function processKey(keyInfo) {
					function whereModifiersDoNotMatch(action) {
						return (xor(action.modifiers, keyInfo.modifiers).length > 0);
					}

					var ignoreCaseKey = keyInfo.key.toLowerCase();

					each(amWithMode, function (actionMap) {
						var keyMap = last(actionMap)[ignoreCaseKey];
						if (keyMap === undefined) {
							return;
						}

						var suitableActions = rejectOrSelect(keyMap, 'onRelease');
						suitableActions = map(suitableActions, ensureMapHasModifiers);
						var matching = reject(suitableActions, whereModifiersDoNotMatch);

						each(matching, invokeCallback);
					});
				});
			}

			processKeys(currentInput.rawData.keys, reject);
			processKeys(currentInput.rawData.singlePressKeys, select);
		}

		var parseMouse = function(currentInput, callback) {
			var applicableActionMaps = select(actionMaps(), function(actionMap) {
        return isApplicable(currentInput.mode, actionMap);
      });

			each(applicableActionMaps, function(actionMapDefinition) {
				var actionMap = last(actionMapDefinition);

				if (actionMap.cursor === undefined) { return; }

				if (currentInput.rawData.mouse) {
					each(actionMap.cursor, function(action) {
						stateMutator()(currentInput.gameId,  callback(action.target, action.noEventKey, currentInput.rawData.mouse));
					});
				}
			});
		};

		var parseTouches = function(currentInput, callback) {
			each(currentInput.rawData.touches, function(touch) {
				var key = 'touch' + touch.id;

				var applicableActionMaps = select(actionMaps(), function(actionMap) {
	        return isApplicable(currentInput.mode, actionMap);
	      });

				each(applicableActionMaps, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					if (actionMap[key] === undefined) { return; }

					each(actionMap[key], function(action) {
						stateMutator()(currentInput.gameId, callback(action.target, action.noEventKey, {x: touch.x, y: touch.y}));
					});
				});
			});
		};

		var parseSticks = function(currentInput, callback) {
			each(['leftStick', 'rightStick'], function(key) {
				if (currentInput.rawData[key] === undefined) {return;}

				var applicableActionMaps = select(actionMaps(), function(actionMap) {
	        return isApplicable(currentInput.mode, actionMap);
	      });

				each(applicableActionMaps, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					if (actionMap[key] === undefined) { return; }

					var data = currentInput.rawData[key];
					each(actionMap[key], function(action) {
						stateMutator()(currentInput.gameId, callback(action.target, action.noEventKey,{x: data.x, y: data.y, force: data.force}));
					});
				});
			});
		};

		definePlugin()('OnPhysicsFrame', function () {
			function ProcessPendingInput (state, delta) {
				var currentInput;
				var somethingHasReceivedInput;
				var data;

				function isActionMapApplicable(actionMap) {
					return isApplicable(currentInput.mode, actionMap);
				}

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

				function doSomethingWithActionMaps(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					each(actionMap.nothing, function(action) {
						if (somethingHasReceivedInput.indexOf(action.noEventKey) === -1) {
							return stateMutator()(currentInput.gameId, action.target(state, data));
						}
					});
				}

				var lengthOfInputStackAtStart = userInput.length;
				for (var i = 0; i < lengthOfInputStackAtStart; i += 1) {
					currentInput = userInput.shift();
					if (currentInput === undefined) {
						return;
					}

					somethingHasReceivedInput = [];
					data = {
						rcvdTimestamp: currentInput.timestamp,
						delta: delta
					};

					parseKeysAndKeypresses(currentInput, keyAndKeypressCallback);
					parseTouches(currentInput, touchCallback);
					parseSticks(currentInput, stickCallback);
					parseMouse(currentInput, mouseCallback);

					var applicableActionMaps = select(actionMaps(), isActionMapApplicable);
					each(applicableActionMaps, doSomethingWithActionMaps);

					lowestInputProcessed[currentInput.gameId] = currentInput.rawData.id;
				}

				var logData = {
					processed: lengthOfInputStackAtStart,
					newInput: userInput.length
				};

				logger().debug(logData, 'OnPhysicsFrame::ProcessPendingInput - done');

				if (logData.newInput > logData.processed) {
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

		return function handle(rawData, timestamp, gameId, mode) {
			logger().called(arguments, 'ensemblejs', 'OnInput', handle);

			userInput.push({
				rawData: rawData,
				timestamp: timestamp,
				gameId: gameId,
				mode: mode
			});
		};
	}
};