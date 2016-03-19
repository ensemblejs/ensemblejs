'use strict';

import {map, reject, each, includes, filter} from 'lodash';
import {supportsInput} from '../../util/device-mode';

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', 'DefinePlugin', '$', 'DeviceMode'],
  func: function InputCapture (window, config, define, $, deviceMode) {

    let touches = [];
    let toRemove = [];
    let receivedInput = false;

    function bindToWindowEvents () {
      const elementId = `#${config().client.inputElement}`;

      $()(elementId).on('touchstart', function (e) {
        each(e.touches, function (touch) {
          if (filter(touches, {id: touch.identifier}).length > 0) {
            return;
          }

          touches.push({
            id: touch.identifier,
            x: touch.clientX - touch.target.offsetLeft,
            y: touch.clientY - touch.target.offsetTop,
            force: touch.force || touch.webkitForce || 1
          });
        });

        receivedInput = true;
      });

      $()(elementId).on('touchmove', function (e) {
        each(e.touches, function (touch) {
          let t = filter(touches, {id: touch.identifier})[0];

          if (t) {
            t.x = touch.clientX - touch.target.offsetLeft;
            t.y = touch.clientY - touch.target.offsetTop;
            t.force = touch.force || touch.webkitForce || 1;
          } else {
            console.log(t);
          }
        });

        receivedInput = true;
      });

      function endTouch (e) {
        toRemove = toRemove.concat(map(e.changedTouches, 'identifier'));
        receivedInput = true;
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
        touches: touches,
        receivedInput: receivedInput
      };

      receivedInput = false;

      touches = reject(touches, function (touch) {
        return includes(toRemove, touch.id);
      });

      toRemove = [];

      return inputData;
    };
  }
};