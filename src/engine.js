'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'ServerSideEngine',
  deps: ['ServerSideUpdate', 'StateAccess', 'StateMutator'],
  func: function (serverSideUpdate, state, mutator) {
    var priorStepTime = Date.now();

    var update = function(dt) {
      each(serverSideUpdate(), function(callback) {
        mutator()(callback(dt));
      });
    };

    var step = function() {
      var now = Date.now();

      if (state().get('ensemble')('paused')) {
        priorStepTime = now;

        return;
      }

      var dt = (now - priorStepTime) / 1000;
      update(dt);

      priorStepTime = now;
    };

    return {
      run: function(frequency) {
        step();
        return setInterval(step, 1000 / frequency);
      }
    };
  }
};