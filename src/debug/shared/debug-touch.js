'use strict';

function createAddTouch (i) {
  return function addTouch (state, x, y) {
    const touches = state.get('ensembleDebug.touches');

    const existingTouch = touches.filter((touch) => touch.id === i);
    if (existingTouch.length > 0) {
      existingTouch[0].x = x;
      existingTouch[0].y = y;
    } else {
      touches.push({id: i, x, y});
    }

    return ['ensembleDebug.touches', touches];
  };
}

function createRemoveTouch (i) {
  return function removeTouch (state) {
    const touches = state.get('ensembleDebug.touches');

    return ['ensembleDebug.touches', touches.filter((touch) => touch.id !== i)];
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
  const actionMap = { nothing: [] };

  const touchCount = 16;
  for(let i = 0; i < touchCount; i += 1) {
    const id = `touch${i}`;
    actionMap[id] = [{call: createAddTouch (i), noEventKey: id}];
    actionMap.nothing.push({call: createRemoveTouch(i), noEventKey: id});
  }

  return actionMap;
}

function OnClientReady (tracker, dimensions, $) {
  function addTouch (id, current) {
    const dims = dimensions().get();

    const touch = require('../../../public/partials/debug/touch.pug');

    $()('#touches').append(touch({
      id: ['touch', id].join('_'),
      x: current.x + dims.marginSides - 10,
      y: current.y + dims.marginTopBottom - 10
    }));
  }

  function moveTouch (id, current) {
    const dims = dimensions().get();
    const eid = `#${['touch', id].join('_')}`;

    $()(eid).css('left', `${(current.x + dims.marginSides - 10)}px`);
    $()(eid).css('top', `${(current.y + dims.marginTopBottom - 10)}px`);
  }

  function removeTouch (id) {
    const eid = `#${['touch', id].join('_')}`;

    $()(eid).remove();
  }

  return function setupTouchStateDebugView () {
    const touchesBlock = require('../../../public/partials/debug/touches.pug');

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