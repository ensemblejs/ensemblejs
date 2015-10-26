'use strict';

var each = require('lodash').each;
var select = require('lodash').select;
var reject = require('lodash').reject;
var last = require('lodash').last;
var xor = require('lodash').xor;
var map = require('lodash').map;
var filterPluginsByMode = require('./modes').filterPluginsByMode;

function ensureMapHasModifiers(action) {
  action.modifiers = action.modifiers || [];
  return action;
}

function parseKeysAndKeypresses (actionMaps, currentInput, waitingForPlayers, callback) {

  var forMode = filterPluginsByMode(actionMaps, currentInput.game.mode);

  function processKeys (keyData, rejectOrSelect) {
    each(keyData, function processKey(keyInfo) {
      function whereModifiersDoNotMatch(action) {
        return (xor(action.modifiers, keyInfo.modifiers).length > 0);
      }

      var ignoreCaseKey = keyInfo.key.toLowerCase();

      each(forMode, function (actionMap) {
        var keyMap = last(actionMap)[ignoreCaseKey];
        if (keyMap === undefined) {
          return;
        }

        var suitableActions = rejectOrSelect(keyMap, 'onRelease');

        if (waitingForPlayers) {
          suitableActions = select(suitableActions, { whenWaiting: true });
        }
        suitableActions = map(suitableActions, ensureMapHasModifiers);
        var matching = reject(suitableActions, whereModifiersDoNotMatch);

        each(matching, function (action) {
          callback(currentInput, ignoreCaseKey, action);
        });
      });
    });
  }

  processKeys(currentInput.rawData.keys, reject);
  processKeys(currentInput.rawData.singlePressKeys, select);
}

function parseMouse (actionMaps, currentInput, waitingForPlayers, callback) {
  var forMode = filterPluginsByMode(actionMaps, currentInput.game.mode);

  each(forMode, function(actionMapDefinition) {
    var actionMap = last(actionMapDefinition);

    if (actionMap.cursor === undefined) { return; }

    if (currentInput.rawData.mouse) {
      var suitableActions = actionMap.cursor;
      if (waitingForPlayers) {
        suitableActions = select(suitableActions, { whenWaiting: true });
      }

      each(suitableActions, function(action) {
        callback(currentInput, 'cursor', action, currentInput.rawData.mouse);
      });
    }
  });
}

function parseTouches (actionMaps, currentInput, waitingForPlayers, callback) {
  var forMode = filterPluginsByMode(actionMaps, currentInput.game.mode);

  each(currentInput.rawData.touches, function(touch) {
    var key = 'touch' + touch.id;

    each(forMode, function(actionMapDefinition) {
      var actionMap = last(actionMapDefinition);

      if (actionMap[key] === undefined) { return; }

      var suitableActions = actionMap[key];
      if (waitingForPlayers) {
        suitableActions = select(suitableActions, { whenWaiting: true });
      }

      each(suitableActions, function(action) {
        callback(currentInput, key, action, {
          x: touch.x,
          y: touch.y
        });
      });
    });
  });
}

function parseSticks (actionMaps, currentInput, waitingForPlayers, callback) {
  var forMode = filterPluginsByMode(actionMaps, currentInput.game.mode);

  each(['leftStick', 'rightStick'], function(key) {
    if (currentInput.rawData[key] === undefined) {return;}

    each(forMode, function(actionMapDefinition) {
      var actionMap = last(actionMapDefinition);

      if (actionMap[key] === undefined) { return; }

      var suitableActions = actionMap[key];
      if (waitingForPlayers) {
        suitableActions = select(suitableActions, { whenWaiting: true });
      }

      var data = currentInput.rawData[key];
      each(suitableActions, function(action) {
        callback(currentInput, key, action, {
          x: data.x,
          y: data.y,
          force: data.force
        });
      });
    });
  });
}

module.exports = {
  parseKeysAndKeypresses: parseKeysAndKeypresses,
  parseMouse: parseMouse,
  parseTouches: parseTouches,
  parseSticks: parseSticks
};