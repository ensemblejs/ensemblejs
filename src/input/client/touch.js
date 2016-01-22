'use strict';

import {contains} from 'lodash/collection';
import {supportsInput} from '../../util/device-mode';

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', 'DefinePlugin', '$', 'DeviceMode'],
  func: function InputCapture (window, config, define, $, deviceMode) {
    var pluck = require('lodash').pluck;
    var reject = require('lodash').reject;
    var each = require('lodash').each;

    var touches = [];

    function bindToWindowEvents () {
      var elementId = '#' + config().client.inputElement;

      $()(elementId).on('touchstart', function (e) {
        each(e.touches, function (touch) {
          var x = touch.clientX - touch.target.offsetLeft;
          var y = touch.clientY - touch.target.offsetTop;
          touches.push({
            id: touch.identifier,
            x: x,
            y: y,
            force: touch.force || touch.webkitForce || 1
          });
        });
      });

      $()(elementId).on('touchmove', function (e) {
        each(e.touches, function (touch) {
          var x = touch.clientX - touch.target.offsetLeft;
          var y = touch.clientY - touch.target.offsetTop;
          touches.push({
            id: touch.identifier,
            x: x,
            y: y,
            force: touch.force || touch.webkitForce || 1
          });
        });
      });

      function endTouch (e) {
        var ids = pluck(e.changedTouches, 'identifier');

        touches = reject(touches, function (touch) {
          return ids.indexOf(touch.id) !== -1;
        });
      }

      $()(elementId).on('touchend', endTouch);
      $()(elementId).on('touchleave', endTouch);
      $()(elementId).on('touchcancel', endTouch);
    }

    define()('OnClientStart', function () {
      return function TouchInputCapture () {
        if (!contains(supportsInput, deviceMode())) {
          return;
        }

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