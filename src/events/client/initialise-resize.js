'use strict';

module.exports = {
  type: 'OnClientStart',
  deps: ['OnResize', 'Dimensions', 'Window', '$'],
  func: function OnClientStart (onResize, dimensions, window, $) {
    var each = require('lodash').each;

    function resizeCanvas () {
      var dims = dimensions().get();

      each(onResize(), function(callback) {
        callback(dims);
      });
    }

    return function initialiseResize () {
      $()(window()).on('load resize', resizeCanvas);
      resizeCanvas();
    };
  }
};