'use strict';

var reject = require('lodash').reject;
var select = require('lodash').select;

function RouteAllInput (config) {
  if (!config().debug.input) {
    return {};
  }

  function addTouch(i) {
    return function(state, x, y) {
      var touches = state.for('ensembleDebug').get('touches');

      var existingTouch = select(touches, {id : i});
      if (existingTouch.length > 0) {
        existingTouch[0].x = x;
        existingTouch[0].y = y;
      } else {
        touches.push({id: i, x: x, y: y});
      }

      return {
        ensembleDebug: {
          touches: touches
        }
      };
    };
  }

  function removeTouch(i) {
    return function(state) {
      var touches = state.for('ensembleDebug').get('touches');

      return {
        ensembleDebug: {
          touches: reject(touches, {id: i})
        }
      };
    };
  }

  var actionMap = {
    nothing: []
  };
  var touchCount = 16;
  for(var i = 0; i < touchCount; i += 1) {
    var id = 'touch' + i;
    actionMap[id] = [{target: addTouch(i), noEventKey: id}];
    actionMap.nothing.push({target: removeTouch(i), noEventKey: id});
  }

  return actionMap;
}

module.exports = {
  type: 'ActionMap',
  deps: ['Config'],
  func: RouteAllInput
};