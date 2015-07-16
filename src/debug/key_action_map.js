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
  if (!config().debug.inputOverlay) {
    return {};
  }

  var keys = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete', 'tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', ',', 'enter', 'left-shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'right-shift', 'control', 'alt/option', 'command', 'space', 'left', 'right', 'up', 'down', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'];

  var actionMap = {
    nothing: []
  };
  each(keys, function(key) {
    actionMap[key] = [{target: createKeyDownFunc(key), noEventKey: key}];
    actionMap.nothing.push({target: createKeyUpFunc(key), noEventKey: key});
  });

  return actionMap;
}

module.exports = {
  type: 'ActionMap',
  deps: ['Config'],
  func: MapAllKeys
};