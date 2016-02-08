'use strict';

import {each, isEqual, filter, remove, includes, reject} from 'lodash';
import {radial} from 'gamepad-api-mappings';
import define from '../../plugins/plug-n-play';

var gamepads = require('../../../config/gamepads.json');

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
    radius: radius,
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
    let sticks = {
      'left-stick': {x: 0, y: 0},
      'right-stick': {x: 0, y: 0}
    };
    var layout = gamepads[config().client.input.virtualGamepad];

    function addVisual (stickId, x, y) {
      $()(stickId).css('background-image', '-webkit-radial-gradient(' + x + 'px ' + y + 'px, circle cover, yellow, orange, red)');
    }

    function removeVisual (stickId) {
      $()(stickId).css('background-image', '');
    }

    function setupStickBindings (stickId) {
      var domStickId = `#${stickId}`;

      $()(domStickId).on('touchstart touchmove', function (e) {
        let touches = filter(e.touches, touch => {
          return isEqual($()(touch.target).attr('id'), $()(e.target).attr('id'));
        });

        each(touches, touch => {
          e.stopPropagation();
          e.preventDefault();

          let t = touchData(touch);
          let coord = radial(t);

          sticks[stickId] = coord;

          addVisual(domStickId, (coord.x * t.radius) + t.radius, (coord.y * t.radius) + t.radius);
        });
      });

      $()(domStickId).on('touchend touchleave touchcancel', function () {
        sticks['left-stick'] = {x: 0, y: 0};

        removeVisual(domStickId);
      });
    }

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

    function setupButtonBindings (buttonId) {
      var domButtonId = `#${buttonId}`;

      $()(domButtonId).on('touchstart', function (e) {
        keys.push(buttonId);
        singlePressKeys.push(buttonId);

        each(e.touches, touch => pressButton(touch.target, buttonId));
      });

      $()(domButtonId).on('touchmove', function (e) {
        keys.push(buttonId);

        each(e.touches, touch => pressButton(touch.target, buttonId));
      });

      $()(domButtonId).on('touchend touchleave touchcancel', function (e) {
        keys = remove(keys, buttonId);
        singlePressKeys = remove(singlePressKeys, buttonId);

        each(e.changedTouches, touch => releaseButton(touch.target, buttonId));
      });
    }

    function bindToWindowEvents () {
      const all = layout.leftSide.concat(layout.rightSide);
      const padSticks = filter(all, c => includes(stickIds, c));
      const padButtons = reject(all, c => includes(stickIds, c ));

      each(padSticks, stick => setupStickBindings(stick));
      each(padButtons, button => setupButtonBindings(button));
    }

    function setupController () {
      $()('#virtual-gamepad').addClass(layout.class);

      each(layout.leftSide, component => {
        const cssClass = includes(stickIds, component) ? 'stick' : 'button';

        $()('#left-side').append(`<div id="${component}" class="${cssClass} base-${component}">${labels[component]}</div>`);
      });

      each(layout.rightSide, component => {
        const cssClass = includes(stickIds, component) ? 'stick' : 'button';

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
      let inputData = {
        'left-stick': sticks['left-stick'],
        'right-stick': sticks['right-stick']
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