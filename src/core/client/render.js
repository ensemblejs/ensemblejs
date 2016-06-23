'use strict';

module.exports = {
  type: 'OnClientReady',
  deps: ['Window', 'OnRenderFrame', 'CurrentState', 'Time', 'DefinePlugin'],
  func: function RenderLoop (window, onRenderFrame, currentState, time, define) {
    let disconnected = false;
    let priorStep = time().present();

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
      const now = time().present();
      const Δ = (now - priorStep) / 1000;
      priorStep = time().present();

      onRenderFrame().forEach(frame => frame(Δ));
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