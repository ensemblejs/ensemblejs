'use strict';

import {each, isEqual, filter, remove} from 'lodash';
import {radial} from 'gamepad-api-mappings';
import define from '../../plugins/plug-n-play';

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', '$', 'DeviceMode'],
  func: function VirtualGamepad (window, config, $, deviceMode) {

    const tempConfig = {
      sticks: ['left-stick'],
      buttons: ['start-forward', 'face-0', 'up', 'down']
    };

    let keys = [];
    let singlePressKeys = [];
    let leftStick = {x: 0, y: 0};
    let rightStick = {x: 0, y: 0};

    function addVisual (elementId, x, y) {
      $()(elementId).css('background-image', '-webkit-radial-gradient(' + x + 'px ' + y + 'px, circle cover, yellow, orange, red)');
    }

    function removeVisual (elementId) {
      $()(elementId).css('background-image', '');
    }

    function touchData (touch) {
      const radius = touch.target.scrollWidth / 2;

      return {
        radius: radius,
        x: (touch.clientX - touch.target.offsetLeft - radius) / radius,
        y: (touch.clientY - touch.target.offsetTop - radius) / radius
      };
    }

    function bindToWindowEvents () {
      const leftStickId = '#left-stick';
      const startForward = '#start-forward';

      $()(leftStickId).on('touchstart touchmove', function (e) {
        let touches = filter(e.touches, touch => {
          return isEqual($()(touch.target).attr('id'), $()(e.target).attr('id'));
        });

        each(touches, touch => {
          e.stopPropagation();
          e.preventDefault();

          let t = touchData(touch);
          let coord = radial(t);

          leftStick = coord;

          addVisual(leftStickId, (coord.x * t.radius) + t.radius, (coord.y * t.radius) + t.radius);
        });
      });

      $()(leftStickId).on('touchend touchleave touchcancel', function () {
        leftStick = {x: 0, y: 0};

        removeVisual(leftStickId);
      });

      function pressButton (receiver, button) {
        $()(receiver)
          .addClass('inverse-' + button)
          .removeClass('base-' + button);
      }

      function releaseButton (receiver, button) {
        $()(receiver)
          .addClass('base-' + button)
          .removeClass('inverse-' + button);
      }

      $()(startForward).on('touchstart', function (e) {
        keys.push('face-0');
        singlePressKeys.push('face-0');

        each(e.touches, touch => pressButton(touch.target, 'button'));
      });

      $()(startForward).on('touchmove', function (e) {
        keys.push('face-0');

        each(e.touches, touch => pressButton(touch.target, 'button'));
      });

      $()(startForward).on('touchend touchleave touchcancel', function (e) {
        keys = remove(keys, 'face-0');
        singlePressKeys = remove(singlePressKeys, 'face-0');

        each(e.changedTouches, touch => releaseButton(touch.target, 'button'));
      });
    }

    define('OnClientStart', function () {
      return function VirtualGamepadInputCapture () {
        if (deviceMode() !== 'gamepad') {
          return;
        }

        bindToWindowEvents();
      };
    });

    return function getCurrentState () {
      let inputData = {
        'left-stick': leftStick,
        'right-stick': rightStick
      };

      let keysToSend = [];
      each(keys, (key) => {
        keysToSend.push({key: key, force: 1, modifiers: []});
      });
      inputData.keys = keysToSend;

      let singlePressKeysToSend = [];
      each(singlePressKeys, (key) => {
        singlePressKeysToSend.push({key: key, force: 1, modifiers: []});
      });
      singlePressKeys = [];
      inputData.singlePressKeys = singlePressKeysToSend;

      return inputData;
    };
  }
};