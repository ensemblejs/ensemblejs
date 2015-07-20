  'use strict';

var reject = require('lodash').reject;
var select = require('lodash').select;

function keyDown (state) {
  var keys = state.for('ensembleDebug').get('keys');

  if (select(keys, {id: 'anchor-action'}).length > 0) {
    return {};
  }

  keys.push({id: 'anchor-action'});

  return {
    ensembleDebug: {
      keys: keys
    }
  };
}

function keyUp (state) {
  var keys = state.for('ensembleDebug').get('keys');
  keys = reject(keys, {id : 'anchor-action'});

  return {
    ensembleDebug: {
      keys: keys
    }
  };
}

function MapAllKeys (config) {
  if (!config().debug.inputOverlay) {
    return {};
  }

  var actionMap = {
    'anchor-action': [{target: keyDown, noEventKey: 'anchor-action'}],
    nothing: [{target: keyUp, noEventKey: 'anchor-action'}]
  };

  return actionMap;
}

module.exports = {
  type: 'ActionMap',
  deps: ['Config'],
  func: MapAllKeys
};