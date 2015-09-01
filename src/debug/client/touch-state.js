'use strict';

module.exports = {
  type: 'OnReady',
  deps: ['Config', 'StateTracker', 'Dimensions', '$'],
  func: function DebugTouchState (config, tracker, dimensions, $) {
    if (!config().debug.input) {
      return config().nothing;
    }

    var touchesBlock = require('../../../public/partials/touches.jade');
    var touch = require('../../../public/partials/touch.jade');

    function touches (state) {
      return state.ensembleDebug.touches;
    }

    function addTouch (id, current) {
      var key = ['touch', id].join('_');
      var dims = dimensions().get();

      $().id('touches').append(touch({
        key: key,
        x: current.x + dims.marginSides,
        y: current.y + dims.marginTopBottom
      }));
    }

    function moveTouch (id, current) {
      var dims = dimensions().get();

      $().id(['touch', id]).css('left', (current.x + dims.marginSides) + 'px');
      $().id(['touch', id]).css('top', (current.y + dims.marginTopBottom) + 'px');
    }

    function removeTouch (id) {
      $().id(['touch', id]).remove();
    }

    return function setupTouchStateDebugView () {
      $()('#debug').append(touchesBlock());

      tracker().onElementAdded(touches, addTouch, function () {});
      tracker().onElementChanged(touches, moveTouch);
      tracker().onElementRemoved(touches, removeTouch);
    };
  }
};