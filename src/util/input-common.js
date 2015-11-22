'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var last = require('lodash').last;
var xor = require('lodash').xor;
var chain = require('lodash').chain;
var filterPluginsByMode = require('./modes').filterPluginsByMode;

function ensureMapHasModifiers(action) {
  action.modifiers = action.modifiers || [];
  return action;
}

//TODO: move to util/modes
function removeMode(pluginAndMode) {
  return last(pluginAndMode);
}

function withValidKey(key) {
  return function (actionMap) {
    return (actionMap[key] !== undefined);
  };
}

function pluckKeyHandler (key) {
  return function (actionMap) {
    return actionMap[key];
  };
}

function removeWithoutWhenWaitingWhenWeAreWaiting(waitingForPlayers) {
  return function (handler) {
    if (!waitingForPlayers) {
      return handler;
    }

    return filter(handler, { whenWaiting: true });
  };
}

function whenWaiting (waitingForPlayers) {
  return function (actions) {
    if (!waitingForPlayers) {
      return true;
    }

    return actions.whenWaiting;
  };
}

function parseKeysAndKeypresses (actionMaps, currentInput, waitingForPlayers, callback) {

  var pluginsForMode = filterPluginsByMode(actionMaps, currentInput.game.mode);

  function processKeys (keyData, rejectOrSelect) {
    each(keyData, function processKey(keyInfo) {

      function whereModifiersDoNotMatch(action) {
        return (xor(action.modifiers, keyInfo.modifiers).length > 0);
      }

      function callTarget(action) {
        callback(currentInput, key, action);
      }

      function rejectOrSelectOnRelease (handler) {
        if (rejectOrSelect === 'reject') {
          return handler.onRelease !== true;
        } else {
          return handler.onRelease === true;
        }
      }

      var key = keyInfo.key.toLowerCase();

      chain(pluginsForMode)
        .map(removeMode)
        .filter(withValidKey(key))
        .map(pluckKeyHandler(key))
        .flatten()
        .filter(rejectOrSelectOnRelease)
        .filter(whenWaiting(waitingForPlayers))
        .map(ensureMapHasModifiers)
        .reject(whereModifiersDoNotMatch)
        .each(callTarget)
        .value();
    });
  }

  processKeys(currentInput.rawData.keys, 'reject');
  processKeys(currentInput.rawData.singlePressKeys, 'select');
}

function parseMouse (actionMaps, currentInput, waitingForPlayers, callback) {
  if (!currentInput.rawData.mouse) {
    return;
  }

  function callTarget (action) {
    callback(currentInput, 'cursor', action, currentInput.rawData.mouse);
  }

  var pluginsForMode = filterPluginsByMode(actionMaps, currentInput.game.mode);

  chain(pluginsForMode)
    .map(removeMode)
    .filter(withValidKey('cursor'))
    .map(pluckKeyHandler('cursor'))
    .map(removeWithoutWhenWaitingWhenWeAreWaiting(waitingForPlayers))
    .flatten()
    .each(callTarget)
    .value();
}

function parseTouches (plugins, currentInput, waitingForPlayers, callback) {
  var pluginsForMode = filterPluginsByMode(plugins, currentInput.game.mode);

  each(currentInput.rawData.touches, function(touch) {
    var key = 'touch' + touch.id;

    function callTarget(action) {
      callback(currentInput, key, action, {
        x: touch.x,
        y: touch.y
      });
    }

    chain(pluginsForMode)
      .map(removeMode)
      .filter(withValidKey(key))
      .map(pluckKeyHandler(key))
      .map(removeWithoutWhenWaitingWhenWeAreWaiting(waitingForPlayers))
      .flatten()
      .each(callTarget)
      .value();
  });
}

function parseSticks (actionMaps, currentInput, waitingForPlayers, callback) {
  var pluginsForMode = filterPluginsByMode(actionMaps, currentInput.game.mode);

  each(['leftStick', 'rightStick'], function(key) {
    if (currentInput.rawData[key] === undefined) {
      return;
    }

    var data = currentInput.rawData[key];

    function callTarget(action) {
      callback(currentInput, key, action, {
        x: data.x,
        y: data.y,
        force: data.force
      });
    }

    chain(pluginsForMode)
      .map(removeMode)
      .filter(withValidKey(key))
      .map(pluckKeyHandler(key))
      .map(removeWithoutWhenWaitingWhenWeAreWaiting(waitingForPlayers))
      .flatten()
      .each(callTarget)
      .value();
  });
}

module.exports = {
  parseKeysAndKeypresses: parseKeysAndKeypresses,
  parseMouse: parseMouse,
  parseTouches: parseTouches,
  parseSticks: parseSticks
};