'use strict';

module.exports = {
  type: 'OnClientReady',
  deps: ['Window', 'OnRenderFrame', 'CurrentState', 'Time', 'DefinePlugin'],
  func: function RenderLoop (window, onRenderFrame, currentState, time, define) {
    var disconnected = false;
    var priorStep = time().present();

    function paused (state) { return state.ensemble.paused; }

    define()('OnDisconnect', function () {
      return function stopRenderLoop () {
        disconnected = true;
      };
    });

    function doPaused () {
      priorStep = time();
    }

    function doRunning () {
      var now = time().present();
      var delta = (now - priorStep) / 1000;
      priorStep = time().present();

      const callbacks = onRenderFrame();
      for(let i = 0; i < callbacks.length; i += 1) {
        callbacks[i](delta);
      }
    }

    function step () {
      if (currentState().get(paused)) {
        doPaused();
      } else {
        doRunning();
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