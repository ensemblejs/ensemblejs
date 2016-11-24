'use strict';

import read from 'ok-selector';

module.exports = {
  type: 'OnClientReady',
  deps: ['Window', 'OnRenderFrame', 'CurrentState', 'Time', 'DefinePlugin', 'DeviceMode'],
  func: function RenderLoop (window, onRenderFrame, currentState, time, define, deviceMode) {
    let disconnected = false;
    let priorStep = time().present();

    const paused = (state) => read(state, 'ensemble.paused');

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

      onRenderFrame().forEach((frame) => frame(Δ));
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