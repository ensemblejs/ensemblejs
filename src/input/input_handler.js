'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var intersection = require('lodash').intersection;
var first = require('lodash').first;
var last = require('lodash').last;
var xor = require('lodash').xor;

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

module.exports = {
	type: 'OnInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator', 'Logger'],
	func: function(actionMaps, definePlugin, stateMutator, logger) {
		var userInput = [];

		var parseKeysAndKeypresses = function(currentInput, callback) {
			var applicableActionMaps = filter(actionMaps(), function(actionMap) {
        return isApplicable(currentInput.mode, actionMap);
      });

			each(currentInput.rawData.keys, function(keyInfo) {
				var ignoreCaseKey = keyInfo.key.toLowerCase();

				//TODO: replace with select
				each(applicableActionMaps, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					if (actionMap[ignoreCaseKey] === undefined) {
						return;
					}

					//TODO: replace with select
					each(actionMap[ignoreCaseKey], function(action) {
						if (action.onRelease) {
							return;
						}

						action.modifiers = action.modifiers || [];
						if (xor(action.modifiers, keyInfo.modifiers).length > 0) {
							return;
						}

						stateMutator()(
							currentInput.gameId,
							callback(action.target, action.noEventKey)
						);
					});
				});
			});

			each(currentInput.rawData.singlePressKeys, function(keyInfo) {
				each(applicableActionMaps, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					var ignoreCaseKey = keyInfo.key.toLowerCase();

					if (actionMap[ignoreCaseKey] === undefined) { return; }

					each(actionMap[ignoreCaseKey], function(action) {
						if (!action.onRelease) {
							return;
						}

						action.modifiers = action.modifiers || [];
						if (xor(action.modifiers, keyInfo.modifiers).length > 0) {
							return;
						}

						stateMutator()(currentInput.gameId, callback(action.target, action.noEventKey));
					});
				});
			});
		};

		var parseMouse = function(currentInput, callback) {
			var applicableActionMaps = filter(actionMaps(), function(actionMap) {
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

				var applicableActionMaps = filter(actionMaps(), function(actionMap) {
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

				var applicableActionMaps = filter(actionMaps(), function(actionMap) {
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

		definePlugin()('ServerSideUpdate', function () {
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

					var applicableActionMaps = filter(actionMaps(), isActionMapApplicable);
					each(applicableActionMaps, doSomethingWithActionMaps);
				}

				var logData = {
					processed: lengthOfInputStackAtStart,
					newInput: userInput.length
				};

				logger().info(logData, 'ServerSideUpdate::ProcessPendingInput - done');

				if (logData.newInput > logData.processed) {
					logger().warn('More input was received than we processed.');
				}
			}

 			return ProcessPendingInput;
		});

		return function(rawData, timestamp, gameId, mode) {
			userInput.push({
				rawData: rawData,
				timestamp: timestamp,
				gameId: gameId,
				mode: mode
			});
		};
	}
};