'use strict';

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', 'DefinePlugin'],
  func: function InputCapture (window, config, define) {
    var pluck = require('lodash').pluck;
    var reject = require('lodash').reject;
    var each = require('lodash').each;
    var $ = require('zepto-browserify').$;

    var touches = [];

    function bindToWindowEvents () {
      var elementId = '#' + config().client.inputElement;

      $(elementId).on('touchstart', function (e) {
        each(e.touches, function (touch) {
          var x = touch.clientX - touch.target.offsetLeft;
          var y = touch.clientY - touch.target.offsetTop;
          touches.push({
            id: touch.identifier,
            x: x,
            y: y,
            force: touch.webkitForce || 1
          });
        });
      });

      $(elementId).on('touchmove', function (e) {
        each(e.touches, function (touch) {
          var x = touch.clientX - touch.target.offsetLeft;
          var y = touch.clientY - touch.target.offsetTop;
          touches.push({
            id: touch.identifier,
            x: x,
            y: y,
            force: touch.webkitForce || 1
          });
        });
      });

      function endTouch (e) {
        var ids = pluck(e.changedTouches, 'identifier');

        touches = reject(touches, function (touch) {
          return ids.indexOf(touch.id) !== -1;
        });
      }

      $(elementId).on('touchend', endTouch);
      $(elementId).on('touchleave', endTouch);
      $(elementId).on('touchcancel', endTouch);
    }

    define()('OnSetup', function () {
      return function TouchInputCapture () {
        bindToWindowEvents();
      };
    });

    return function getCurrentState () {
      var inputData = {
        touches: touches
      };

      return inputData;
    };
  }
};