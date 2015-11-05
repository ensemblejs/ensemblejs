'use strict';

var each = require('lodash').each;
var reject = require('lodash').reject;
var select = require('lodash').select;

function createKeyDownFunc (key) {
  return function (state) {
    var keys = state.for('ensembleDebug').get('keys');

    if (select(keys, {id: key}).length > 0) {
      return {};
    }

    keys.push({id: key});

    return {
      ensembleDebug: {
        keys: keys
      }
    };
  };
}

function createKeyUpFunc (key) {
  return function (state) {
    var keys = state.for('ensembleDebug').get('keys');
    keys = reject(keys, {id : key});

    return {
      ensembleDebug: {
        keys: keys
      }
    };
  };
}

function MapAllKeys (config) {
  if (!config().debug.input) {
    return {};
  }

  var keys = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete', 'tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', ',', 'enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'command', 'space', 'left', 'right', 'up', 'down', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'escape', 'caps'];

  var modifiers = [
    ['ctrl'], ['alt'], ['shift'],
    ['ctrl', 'alt'], ['ctrl', 'shift'], ['alt', 'shift'],
    ['ctrl', 'alt', 'shift']
  ];

  var actionMap = {
    nothing: []
  };

  each(keys, function(key) {
    actionMap[key] = [{target: createKeyDownFunc(key), noEventKey: key}];
    actionMap.nothing.push({target: createKeyUpFunc(key), noEventKey: key});

    each(modifiers, function(modifier) {
      var modifiedKey = modifier.join('_') + '_' + key;

      if (modifiedKey === 'ctrl_tab' || modifiedKey === 'ctrl_shift_tab') {
        return;
      }

      actionMap[key].push({
        target: createKeyDownFunc(modifiedKey),
        noEventKey: modifiedKey,
        modifiers: modifier
      });
      actionMap.nothing.push({
        target: createKeyUpFunc(modifiedKey),
        noEventKey: modifiedKey
      });
    });
  });

  return actionMap;
}

module.exports = {
  type: 'ActionMap',
  deps: ['Config'],
  func: MapAllKeys
};