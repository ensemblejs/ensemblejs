'use strict';

import {pluck, reject, each, contains} from 'lodash';
import {supportsInput} from 'src/util/device-mode';

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', 'DefinePlugin', '$', 'DeviceMode'],
  func: function InputCapture (window, config, define, $, deviceMode) {

    let touches = [];

    function bindToWindowEvents () {
      const elementId = `#${config().client.inputElement}`;

      $()(elementId).on('touchstart', function (e) {
        each(e.touches, function (touch) {
          let x = touch.clientX - touch.target.offsetLeft;
          let y = touch.clientY - touch.target.offsetTop;
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
          let x = touch.clientX - touch.target.offsetLeft;
          let y = touch.clientY - touch.target.offsetTop;
          touches.push({
            id: touch.identifier,
            x: x,
            y: y,
            force: touch.force || touch.webkitForce || 1
          });
        });
      });

      function endTouch (e) {
        let ids = pluck(e.changedTouches, 'identifier');

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
      let inputData = {
        touches: touches
      };

      return inputData;
    };
  }
};