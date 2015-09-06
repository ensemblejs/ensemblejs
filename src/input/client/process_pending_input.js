'use strict';

var each = require('lodash').each;
var select = require('lodash').select;
var reject = require('lodash').reject;
var last = require('lodash').last;
var xor = require('lodash').xor;
var map = require('lodash').map;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

function ensureMapHasModifiers(action) {
	action.modifiers = action.modifiers || [];
	return action;
}

module.exports = {
	type: 'OnInput',
	deps: ['ActionMap', 'DefinePlugin', 'StateMutator'],
	func: function OnInput (actionMaps, define, mutate) {
		function parseKeysAndKeypresses (currentInput, callback) {
			var mode = currentInput.mode;

      function invokeCallback(action) {
				mutate()(
					currentInput.game.id,
					callback(action.target, action.noEventKey)
				);
			}

			var amWithMode = filterPluginsByMode(actionMaps(), mode);

			function processKeys (keyData, rejectOrSelect) {
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

		function parseMouse (currentInput, callback) {
			var forMode = filterPluginsByMode(actionMaps(), currentInput.game.mode);

			each(forMode, function(actionMapDefinition) {
				var actionMap = last(actionMapDefinition);

				if (actionMap.cursor === undefined) { return; }

				if (currentInput.rawData.mouse) {
					each(actionMap.cursor, function(action) {
						mutate()(currentInput.game.id,  callback(
							action.target,
							action.noEventKey,
							currentInput.rawData.mouse
						));
					});
				}
			});
		}

		function parseTouches (currentInput, callback) {
			var forMode = filterPluginsByMode(actionMaps(), currentInput.game.mode);

			each(currentInput.rawData.touches, function(touch) {
				var key = 'touch' + touch.id;

				each(forMode, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					if (actionMap[key] === undefined) { return; }

					each(actionMap[key], function(action) {
						mutate()(currentInput.game.id, callback(action.target, action.noEventKey, {x: touch.x, y: touch.y}));
					});
				});
			});
		}

		function parseSticks (currentInput, callback) {
			var forMode = filterPluginsByMode(actionMaps(), currentInput.game.mode);

			each(['leftStick', 'rightStick'], function(key) {
				if (currentInput.rawData[key] === undefined) {return;}

				each(forMode, function(actionMapDefinition) {
					var actionMap = last(actionMapDefinition);

					if (actionMap[key] === undefined) { return; }

					var data = currentInput.rawData[key];
					each(actionMap[key], function(action) {
						mutate()(currentInput.game.id, callback(action.target, action.noEventKey,{x: data.x, y: data.y, force: data.force}));
					});
				});
			});
		}

		define()('OnPhysicsFrame', ['InputQueue'], function OnPhysicsFrame (inputQueue) {

			return function processPendingInput (state, delta) {
				var currentInput;
				var somethingHasReceivedInput;
				var data;

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
							return mutate()(
								currentInput.game.id,
								action.target(state, data
							));
						}
					});
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
						delta: delta
					};

					parseKeysAndKeypresses(currentInput, keyAndKeypressCallback);
					parseTouches(currentInput, touchCallback);
					parseSticks(currentInput, stickCallback);
					parseMouse(currentInput, mouseCallback);

					var forMode = filterPluginsByMode(actionMaps(), currentInput.game.mode);
					each(forMode, doSomethingWithActionMaps);
				}
			};
		});
	}
};