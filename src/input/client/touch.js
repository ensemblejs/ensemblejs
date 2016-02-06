'use strict';

import {map, reject, each, includes} from 'lodash';
import {supportsInput} from '../../util/device-mode';

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
        let ids = map(e.changedTouches, 'identifier');

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
        if (!includes(supportsInput, deviceMode())) {
          return;
        }
        if (deviceMode() === 'virtual-gamepad') {
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