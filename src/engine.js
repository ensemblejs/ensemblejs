'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'ServerSideEngine',
  deps: ['ServerSideUpdate', 'StateAccess'],
  func: function (serverSideUpdate, state) {
    var priorStepTime = Date.now();

    var update = function(dt) {
      each(serverSideUpdate(), function(callback) {
        callback(dt);
      });
    };

    var step = function() {
      var now = Date.now();

      if (state().get('ensemble')('paused')) {
        return now;
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