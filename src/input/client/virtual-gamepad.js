'use strict';

import {isEqual, remove} from 'lodash';
import {radial} from 'gamepad-api-mappings';
import define from '../../plugins/plug-n-play';
import disabledInputHandler from './disabled-input-handler';

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
  deps: ['Window', '$', 'DeviceMode'],
  func: function VirtualGamepad (window, $, deviceMode) {
    if (!deviceMode().supportedInput.includes('virtual-gamepad')) {
      return disabledInputHandler;
    }

    let keys = [];
    let keysToRemove = [];
    let singlePressKeys = [];
    let singlePressKeysToRemove = [];
    const sticks = {
      'left-stick': {x: 0, y: 0},
      'right-stick': {x: 0, y: 0}
    };
    const layout = gamepads[deviceMode().virtualGamepad];
    let receivedInput = false;

    function addVisual (stickId, x, y) {
      $()(stickId).css('background-image', `-webkit-radial-gradient(${x}px ${y}px, circle cover, yellow, orange, red)`);
    }

    function removeVisual (stickId) {
      $()(stickId).css('background-image', '');
    }

    function setupStickBindings (stickId) {
      const domStickId = `#${stickId}`;

      const positionStick = (e) => {

        const touches = [];
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];

          if (isEqual($()(touch.target).attr('id'), $()(e.target).attr('id'))) {
            touches.push(touch);
          }
        }

        touches.forEach((touch) => {
          e.stopPropagation();
          e.preventDefault();

          const t = touchData(touch);
          const coord = radial(t);

          sticks[stickId] = coord;

          addVisual(domStickId, (coord.x * t.radius) + t.radius, (coord.y * t.radius) + t.radius);
        });

        receivedInput = true;
      };

      const resetStick = (e) => {
        sticks['left-stick'] = {x: 0, y: 0};

        removeVisual(domStickId);

        receivedInput = true;
      };

      const stick = window().document.getElementById(stickId);
      stick.addEventListener('touchstart', positionStick, false);
      stick.addEventListener('touchmove', positionStick, false);
      stick.addEventListener('touchend', resetStick, false);
      stick.addEventListener('touchcancel', resetStick, false);
      stick.addEventListener('touchleave', resetStick, false);
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
      const handleStart = (e) => {
        keys.push(buttonId);
        singlePressKeys.push(buttonId);

        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          pressButton(touch.target, buttonId);
        }

        receivedInput = true;
      }

      const handleMove = (e) => {
        keys.push(buttonId);

        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          pressButton(touch.target, buttonId);
        }

        receivedInput = true;
      }

      const handleEnd = (e) => {
        keysToRemove.push(buttonId);
        singlePressKeysToRemove.push(buttonId);

        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          releaseButton(touch.target, buttonId);
        }

        receivedInput = true;
      }

      const button = window().document.getElementById(buttonId);
      button.addEventListener('touchstart', handleStart, false);
      button.addEventListener('touchmove', handleMove, false);
      button.addEventListener('touchend', handleEnd, false);
      button.addEventListener('touchcancel', handleEnd, false);
      button.addEventListener('touchleave', handleEnd, false);
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
        console.info('Configuring device as a virtual-gamepad.')

        setupController();
        bindToWindowEvents();
      };
    });

    return function getCurrentState () {
      const inputData = {
        'left-stick': sticks['left-stick'],
        'right-stick': sticks['right-stick'],
        receivedInput,
        keys: keys.map((key) => ({key, force: 1, modifiers: []})),
        singlePressKeys: singlePressKeys.splice(0).map((key) => ({key, force: 1, modifiers: []}))
      };

      receivedInput = false;
      keys = keys.filter((key) => !keysToRemove.includes(key));
      singlePressKeys = singlePressKeys.filter((key) => !singlePressKeysToRemove.includes(key));
      keysToRemove = [];
      singlePressKeysToRemove = [];

      return inputData;
    };
  }
};