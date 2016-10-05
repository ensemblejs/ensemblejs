'use strict';

import xor from 'lodash/xor';
import flatten from 'lodash/flatten';

const filterPluginsByMode = require('./modes').filterPluginsByMode;
const stripMode = require('./modes').stripMode;

function ensureMapHasModifiers(action) {
  action.modifiers = action.modifiers || [];
  return action;
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
  return function (handlers) {
    if (!waitingForPlayers) {
      return handlers;
    }

    return handlers.filter((handler) => handler.whenWaiting);
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

  const pluginsForMode = filterPluginsByMode(actionMaps, currentInput.save.mode);

  function processKeys (keyData = [], rejectOrSelect) {
    keyData.forEach(function processKey(keyInfo) {

      const key = keyInfo.key.toLowerCase();

      function whereModifiersDoNotMatch(action) {
        return !(xor(action.modifiers, keyInfo.modifiers).length > 0);
      }

      function callTarget(action) {
        callback(currentInput, key, action, {
          key,
          force: keyInfo.force || 1
        });
      }

      function rejectOrSelectOnRelease (handler) {
        return (rejectOrSelect === 'reject') ? !handler.onRelease : handler.onRelease;
      }

      flatten(
        pluginsForMode
          .map(stripMode)
          .filter(withValidKey(key))
          .map(pluckKeyHandler(key))
      )
      .filter(rejectOrSelectOnRelease)
      .filter(whenWaiting(waitingForPlayers))
      .map(ensureMapHasModifiers)
      .filter(whereModifiersDoNotMatch)
      .forEach(callTarget);
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

  const pluginsForMode = filterPluginsByMode(actionMaps, currentInput.save.mode);

  flatten(
    pluginsForMode
      .map(stripMode)
      .filter(withValidKey('cursor'))
      .map(pluckKeyHandler('cursor'))
      .map(removeWithoutWhenWaitingWhenWeAreWaiting(waitingForPlayers))
    )
    .forEach(callTarget);
}

function parseTouches (plugins, currentInput, waitingForPlayers, callback) {
  const pluginsForMode = filterPluginsByMode(plugins, currentInput.save.mode);

  if (!currentInput.rawData.touches) {
    return;
  }

  currentInput.rawData.touches.forEach((touch) => {
    const key = `touch${touch.id}`;

    function callTarget(action) {
      callback(currentInput, key, action, {
        x: touch.x,
        y: touch.y
      });
    }

    flatten(
      pluginsForMode
        .map(stripMode)
        .filter(withValidKey(key))
        .map(pluckKeyHandler(key))
        .map(removeWithoutWhenWaitingWhenWeAreWaiting(waitingForPlayers))
    )
    .forEach(callTarget);
  });
}

function parseSticks (actionMaps, currentInput, waitingForPlayers, callback) {
  const pluginsForMode = filterPluginsByMode(actionMaps, currentInput.save.mode);

  ['left-stick', 'right-stick'].forEach(function(key) {
    if (currentInput.rawData[key] === undefined) {
      return;
    }

    const data = currentInput.rawData[key];

    function callTarget(action) {
      callback(currentInput, key, action, {
        x: data.x,
        y: data.y
      });
    }

    flatten(
      pluginsForMode
        .map(stripMode)
        .filter(withValidKey(key))
        .map(pluckKeyHandler(key))
        .map(removeWithoutWhenWaitingWhenWeAreWaiting(waitingForPlayers))
    )
    .forEach(callTarget);
  });
}

module.exports = {
  parseKeysAndKeypresses,
  parseMouse,
  parseTouches,
  parseSticks
};