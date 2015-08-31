'use strict';

module.exports = {
  type: 'OnSetup',
  deps: ['OnResize', 'Dimensions', 'Window', '$'],
  func: function OnSetup (onResize, dimensions, window, $) {
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