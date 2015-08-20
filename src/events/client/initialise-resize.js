'use strict';

module.exports = {
  type: 'OnSetup',
  deps: ['OnResize', 'Dimensions', 'Window'],
  func: function OnSetup (resizeCallbacks, dimensions, window) {
    var each = require('lodash').each;
    var $ = require('zepto-browserify').$;

    function resizeCanvas () {
      var dims = dimensions().get();

      each(resizeCallbacks(), function(resizeCallback) {
        resizeCallback(dims);
      });
    }

    return function initialiseResize () {
      $(window()).on('load resize', resizeCanvas);
      resizeCanvas();
    };
  }
};