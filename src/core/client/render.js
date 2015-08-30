'use strict';

module.exports = {
  deps: ['Window', 'On', 'CurrentState', 'Time'],
  type: 'RenderLoop',
  func: function RenderLoop (window, on, currentState, time) {
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

          on().renderFrame(delta);
        }

        window().requestAnimationFrame(this.run.bind(this));
      }
    };
  }
};