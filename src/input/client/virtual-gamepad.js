'use strict';

import {isEqual, remove} from 'lodash';
import {radial} from 'gamepad-api-mappings';
import define from '../../plugins/plug-n-play';

const gamepads = require('../../../config/gamepads.json');

const stickIds = ['left-stick', 'right-stick'];

const labels = {
  'left-stick': '',
  'right-stick': '',
  up: '►',
  down: '►',
  left: '►',
  right: '►',
  'start-forward': '►',
  'select-back': '►',
  'face-0': 'N',
  'face-1': 'S',
  'face-2': 'E',
  'face-3': 'M',
  'face-4': 'B',
  'face-5': 'L',
  'home': '&#xe900;'
};

function touchData (touch) {
  const radius = touch.target.scrollWidth / 2;

  return {
    radius,
    x: (touch.clientX - touch.target.offsetLeft - radius) / radius,
    y: (touch.clientY - touch.target.offsetTop - radius) / radius
  };
}

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', '$', 'DeviceMode'],
  func: function VirtualGamepad (window, config, $, deviceMode) {
    let keys = [];
    let singlePressKeys = [];
    const sticks = {
      'left-stick': {x: 0, y: 0},
      'right-stick': {x: 0, y: 0}
    };
    const layout = gamepads[config().client.input.virtualGamepad];
    let receivedInput = false;

    function addVisual (stickId, x, y) {
      $()(stickId).css('background-image', `-webkit-radial-gradient(${x}px ${y}px, circle cover, yellow, orange, red)`);
    }

    function removeVisual (stickId) {
      $()(stickId).css('background-image', '');
    }

    function setupStickBindings (stickId) {
      const domStickId = `#${stickId}`;

      $()(domStickId).on('touchstart touchmove', function (e) {
        const touches = e.touches.filter((touch) => {
          return isEqual($()(touch.target).attr('id'), $()(e.target).attr('id'));
        });

        touches.forEach((touch) => {
          e.stopPropagation();
          e.preventDefault();

          const t = touchData(touch);
          const coord = radial(t);

          sticks[stickId] = coord;

          addVisual(domStickId, (coord.x * t.radius) + t.radius, (coord.y * t.radius) + t.radius);
        });

        receivedInput = true;
      });

      $()(domStickId).on('touchend touchleave touchcancel', function () {
        sticks['left-stick'] = {x: 0, y: 0};

        removeVisual(domStickId);

        receivedInput = true;
      });
    }

    function pressButton (receiver, button) {
      $()(receiver)
        .addClass(`inverse-${button}`)
        .removeClass(`base-${button}`);
    }

    function releaseButton (receiver, button) {
      $()(receiver)
        .addClass(`base-${button}`)
        .removeClass(`inverse-${button}`);
    }

    function setupButtonBindings (buttonId) {
      const domButtonId = `#${buttonId}`;

      $()(domButtonId).on('touchstart', function (e) {
        keys.push(buttonId);
        singlePressKeys.push(buttonId);

        e.touchesforEach((touch) => pressButton(touch.target, buttonId));

        receivedInput = true;
      });

      $()(domButtonId).on('touchmove', function (e) {
        keys.push(buttonId);

        e.touchesforEach((touch) => pressButton(touch.target, buttonId));

        receivedInput = true;
      });

      $()(domButtonId).on('touchend touchleave touchcancel', function (e) {
        keys = remove(keys, buttonId);
        singlePressKeys = remove(singlePressKeys, buttonId);

        e.changedTouches.forEach((touch) => releaseButton(touch.target, buttonId));

        receivedInput = true;
      });
    }

    function bindToWindowEvents () {
      const all = layout.leftSide.concat(layout.rightSide);
      const padSticks = all.filter((c) => stickIds.includes(c));
      const padButtons = all.filter((c) => !stickIds.includes(c));

      padSticks.forEach((stick) => setupStickBindings(stick));
      padButtons.forEach((button) => setupButtonBindings(button));
    }

    function setupController () {
      $()('#virtual-gamepad').addClass(layout.class);

      layout.leftSide.forEach((component) => {
        const cssClass = stickIds.includes(component) ? 'stick' : 'button';

        $()('#left-side').append(`<div id="${component}" class="${cssClass} base-${component}">${labels[component]}</div>`);
      });

      layout.rightSide.forEach((component) => {
        const cssClass = stickIds.includes(component) ? 'stick' : 'button';

        $()('#right-side').append(`<div id="${component}" class="${cssClass} base-${component}">${labels[component]}</div>`);
      });
    }

    define('OnClientStart', function () {
      return function VirtualGamepadInputCapture () {
        if (deviceMode() !== 'gamepad') {
          return;
        }

        setupController();
        bindToWindowEvents();
      };
    });

    return function getCurrentState () {
      const inputData = {
        'left-stick': sticks['left-stick'],
        'right-stick': sticks['right-stick'],
        receivedInput
      };

      const keysToSend = [];
      keys.forEach((key) => {
        keysToSend.push({key, force: 1, modifiers: []});
      });
      inputData.keys = keysToSend;

      const singlePressKeysToSend = [];
      singlePressKeys.forEach((key) => {
        singlePressKeysToSend.push({key, force: 1, modifiers: []});
      });
      singlePressKeys = [];
      inputData.singlePressKeys = singlePressKeysToSend;

      receivedInput = false;

      return inputData;
    };
  }
};