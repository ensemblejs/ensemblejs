'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var intersection = require('lodash').intersection;
var first = require('lodash').first;
var last = require('lodash').last;

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

module.exports = {
	type: 'OnInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator'],
	func: function(actionMaps, definePlugin, stateMutator) {
		var userInput = [];

		var parseKeysAndKeypresses = function(currentInput, callback) {
			var applicableActionMaps = filter(actionMaps(), function(actionMap) {
        return isApplicable(currentInput.mode, actionMap);
      });

			each(currentInput.rawData.keys, function(key) {
				each(applicableActionMaps, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					if (actionMap[key] === undefined) { return; }

					each(actionMap[key], function(action) {
						if (action.onRelease) { return; }

						stateMutator()(currentInput.gameId, callback(action.target, action.noEventKey));
					});
				});
			});

			each(currentInput.rawData.singlePressKeys, function(key) {
				each(applicableActionMaps, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					if (actionMap[key] === undefined) { return; }

					each(actionMap[key], function(action) {
						if (!action.onRelease) { return; }

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
 			return function (state, delta) {
				var currentInput = userInput.shift();
				if (currentInput === undefined) {
					return;
				}

				var data = {
					rcvdTimestamp: currentInput.timestamp,
					delta: delta
				};

				var applicableActionMaps = filter(actionMaps(), function(actionMap) {
          return isApplicable(currentInput.mode, actionMap);
        });

				var somethingHasReceivedInput = [];
				parseKeysAndKeypresses(currentInput, function(target, noEventKey) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, data);
				});

				parseTouches(currentInput, function(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, inputData.x, inputData.y, data);
				});

				parseSticks(currentInput, function(target, noEventKey, inputData) {
					somethingHasReceivedInput.push(noEventKey);
					return target(state, inputData.x, inputData.y, inputData.force, data);
				});

				parseMouse(currentInput, function(target, noEventKey, inputData) {
					return target(state, inputData.x, inputData.y, data);
				});

				each(applicableActionMaps, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					each(actionMap.nothing, function(action) {
						if (somethingHasReceivedInput.indexOf(action.noEventKey) === -1) {
							return stateMutator()(currentInput.gameId, action.target(state, data));
						}
					});
				});
			};
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