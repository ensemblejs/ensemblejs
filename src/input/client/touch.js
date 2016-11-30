'use strict';

import disabledInputHandler from './disabled-input-handler';

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', 'DefinePlugin', '$', 'DeviceMode'],
  func: function InputCapture (window, config, define, $, deviceMode) {
    if (!deviceMode().supportedInput.includes('touch')) {
      return disabledInputHandler;
    }

    let touches = [];
    let toRemove = [];
    let receivedInput = false;

    function bindToWindowEvents () {
      const elementId = `#${config().client.inputElement}`;

      $()(elementId).on('touchstart', function (e) {
        e.touches.forEach(function (touch) {
          if (touches.filter((t) => t.id === touch.identifier).length > 0) {
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
        e.touches.forEach(function (touch) {
          const t = touches.filter((t2) => t2.id === touch.identifier)[0];

          if (t) {
            t.x = touch.clientX - touch.target.offsetLeft;
            t.y = touch.clientY - touch.target.offsetTop;
            t.force = touch.force || touch.webkitForce || 1;
          }
        });

        receivedInput = true;
      });

      function endTouch (e) {
        toRemove = toRemove.concat(e.changedTouches.map((t) => t.identifier));
        receivedInput = true;
      }

      $()(elementId).on('touchend', endTouch);
      $()(elementId).on('touchleave', endTouch);
      $()(elementId).on('touchcancel', endTouch);
    }

    define()('OnClientStart', function () {
      return function TouchInputCapture () {
        bindToWindowEvents();
      };
    });

    return function getCurrentState () {
      const inputData = {
        touches,
        receivedInput
      };

      receivedInput = false;

      touches = touches.filter((touch) => !toRemove.includes(touch.id));
      toRemove = [];

      return inputData;
    };
  }
};