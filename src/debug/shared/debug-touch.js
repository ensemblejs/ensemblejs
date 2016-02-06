'use strict';

var reject = require('lodash').reject;
var filter = require('lodash').filter;

function createAddTouch (i) {
  return function addTouch (state, x, y) {
    var touches = state.get('ensembleDebug.touches');

    var existingTouch = filter(touches, {id : i});
    if (existingTouch.length > 0) {
      existingTouch[0].x = x;
      existingTouch[0].y = y;
    } else {
      touches.push({id: i, x: x, y: y});
    }

    return ['ensembleDebug.touches', touches];
  };
}

function createRemoveTouch (i) {
  return function removeTouch (state) {
    var touches = state.get('ensembleDebug.touches');

    return ['ensembleDebug.touches', reject(touches, {id: i})];
  };
}

function StateSeed () {
  return {
    ensembleDebug: {
      touches: []
    }
  };
}

function ActionMap () {
  var actionMap = { nothing: [] };

  var touchCount = 16;
  for(var i = 0; i < touchCount; i += 1) {
    var id = 'touch' + i;
    actionMap[id] = [{call: createAddTouch (i), noEventKey: id}];
    actionMap.nothing.push({call: createRemoveTouch(i), noEventKey: id});
  }

  return actionMap;
}

function OnClientReady (tracker, dimensions, $) {
  function addTouch (id, current) {
    var dims = dimensions().get();

    var touch = require('../../../public/partials/debug/touch.jade');

    $()('#touches').append(touch({
      id: ['touch', id].join('_'),
      x: current.x + dims.marginSides - 10,
      y: current.y + dims.marginTopBottom - 10
    }));
  }

  function moveTouch (id, current) {
    var dims = dimensions().get();
    var eid = '#' + ['touch', id].join('_');

    $()(eid).css('left', (current.x + dims.marginSides - 10) + 'px');
    $()(eid).css('top', (current.y + dims.marginTopBottom - 10) + 'px');
  }

  function removeTouch (id) {
    var eid = '#' + ['touch', id].join('_');

    $()(eid).remove();
  }

  return function setupTouchStateDebugView () {
    var touchesBlock = require('../../../public/partials/debug/touches.jade');

    $()('#overlay').append(touchesBlock());

    tracker().onElementAdded('ensembleDebug.touches', addTouch);
    tracker().onElementChanged('ensembleDebug.touches', moveTouch);
    tracker().onElementRemoved('ensembleDebug.touches', removeTouch);
  };
}

module.exports = {
  type: 'DebugTouch',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugTouch (config, define) {
    if (!config().debug.input) {
      return;
    }

    define()('StateSeed', StateSeed);
    define()('ActionMap', ActionMap);
    define()('OnClientReady', ['StateTracker', 'Dimensions', '$'], OnClientReady);
  }
};