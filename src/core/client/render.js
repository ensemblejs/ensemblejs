'use strict';

var each = require('lodash').each;

module.exports = {
  deps: ['Window', 'OnRenderFrame', 'CurrentState', 'Time'],
  type: 'RenderLoop',
  func: function RenderLoop (window, onRenderFrame, currentState, time) {

    var priorStep = time().present();

    function paused (state) { return state.ensemble.paused; }

    return {
      run: function run () {
        if (currentState().get(paused)) {
          priorStep = time();
        } else {
          var now = time().present();
          var delta = (now - priorStep) / 1000;
          priorStep = time().present();

          each(onRenderFrame(), function (callback) {
            callback(delta);
          });
        }

        window().requestAnimationFrame(this.run.bind(this));
      }
    };
  }
};