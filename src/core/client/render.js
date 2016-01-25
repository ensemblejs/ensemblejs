'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'OnClientReady',
  deps: ['Window', 'OnRenderFrame', 'CurrentState', 'Time', 'DefinePlugin', 'Profiler'],
  func: function RenderLoop (window, onRenderFrame, currentState, time, define, profiler) {
    var fps = profiler().timer('ensemblejs', 'render', 'fps', 1);
    var disconnected = false;
    var priorStep = time().present();

    function paused (state) { return state.ensemble.paused; }

    define()('OnDisconnect', function () {
      return function stopRenderLoop () {
        disconnected = true;
      };
    });

    define()('InternalState', function TrackLatency () {
      return {
        RenderLoop: {
          fps: function frameRateResults () {
            return fps.results().rate;
          }
        }
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
        fps.track(doRunning);
      }

      if (!disconnected){
        window().requestAnimationFrame(step);
      }
    }

    return function run () {
      step();
    };
  }
};