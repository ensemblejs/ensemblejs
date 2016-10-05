'use strict';

function StateSeed () {
  return { ensembleDebug: { keys: [] } };
}

function createKeyDownFunc (key) {
  return function (state) {
    const keys = state.get('ensembleDebug.keys');

    if (keys.filter((k) => k.id === key).length > 0) {
      return {};
    }

    keys.push({id: key});

    return ['ensembleDebug.keys', keys];
  };
}

function createKeyUpFunc (key) {
  return function (state) {
    let keys = state.get('ensembleDebug.keys');
    keys = keys.filter((k) => k.id !== key)

    return ['ensembleDebug.keys', keys];
  };
}

const keys = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete', 'tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', ',', 'enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'command', 'space', 'left', 'right', 'up', 'down', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'escape', 'caps'];

const modifiers = [
  ['ctrl'], ['alt'], ['shift'],
  ['ctrl', 'alt'], ['ctrl', 'shift'], ['alt', 'shift'],
  ['ctrl', 'alt', 'shift']
];

function ActionMap () {
  const actionMap = { nothing: [] };

  keys.forEach(function eachKey (key) {
    actionMap[key] = [{call: createKeyDownFunc(key), noEventKey: key, whenWaiting: true}];
    actionMap.nothing.push({call: createKeyUpFunc(key), noEventKey: key, whenWaiting: true});

    modifiers.forEach(function eachModifier (modifier) {
      const modifiedKey = `${modifier.join('_')}_${key}`;

      if (modifiedKey === 'ctrl_tab' || modifiedKey === 'ctrl_shift_tab') {
        return;
      }

      actionMap[key].push({
        call: createKeyDownFunc(modifiedKey),
        noEventKey: modifiedKey,
        modifiers: modifier,
        whenWaiting: true
      });
      actionMap.nothing.push({
        call: createKeyUpFunc(modifiedKey),
        noEventKey: modifiedKey,
        whenWaiting: true
      });
    });
  });

  return actionMap;
}

function OnClientReady (tracker, $) {
  const unsupportedIds = {
    '=': 'equals',
    ';': 'semicolon',
    '\'': 'single-quote',
    ',': 'comma',
    '.': 'period',
    '/': 'forward-slash',
    '\\': 'back-slash',
    '`': 'back-tick',
    '[': 'open-square-bracket',
    ']': 'close-square-bracket'
  };

  function safeId (key) {
    return unsupportedIds[key] ? unsupportedIds[key] : key;
  }

  function addKey (id) {
    const keyState = require('../../../public/partials/debug/key-state.pug');
    const domId = ['key', safeId(id)].join('_');

    $()('#keys').append(keyState({id: domId, value: id}));
  }

  function removeKey (id) {
    const domId = ['key', safeId(id)].join('_');

    $()(`#${domId}`).remove();
  }

  return function setupKeyStateDebugView () {
    const keysTemplate = require('../../../public/partials/debug/keys.pug');

    $()('#debug').append(keysTemplate());

    tracker().onElementAdded('ensembleDebug.keys', addKey);
    tracker().onElementRemoved('ensembleDebug.keys', removeKey);
  };
}

module.exports = {
  type: 'DebugKeyState',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugKeyState (config, define) {
    if (!config().debug.input) {
      return;
    }

    define()('StateSeed', StateSeed);
    define()('ActionMap', ActionMap);
    define()('OnClientReady', ['StateTracker', '$'], OnClientReady);
  }
};