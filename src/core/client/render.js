'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'OnReady',
  deps: ['Window', 'OnRenderFrame', 'CurrentState', 'Time', 'DefinePlugin'],
  func: function RenderLoop (window, onRenderFrame, currentState, time, define) {

    var priorStep = time().present();

    function paused (state) { return state.ensemble.paused; }

    define()('OnDisconnect', function () {
      return function stopRenderLoop () {
        window().clearAnimationFrame(id);
        id = null;
      };
    });

    function doPaused () {
      priorStep = time();
    }

    function doRunning () {
      var now = time().present();
      var delta = (now - priorStep) / 1000;
      priorStep = time().present();

      each(onRenderFrame(), function (callback) {
        callback(delta);
      });
    }

    function step () {
      if (currentState().get(paused)) {
        doPaused();
      } else {
        doRunning();
      }
    }

    var id;
    return function run () {
      step();
      id = window().requestAnimationFrame(step.bind(this));
    };
  }
};