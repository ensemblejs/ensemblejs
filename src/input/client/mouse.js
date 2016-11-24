'use strict';

const each = require('lodash').each;
import disabledInputHandler from './disabled-input-handler';

function mouseMap () {
  return {
    '1': 'primary',
    '2': 'tertiary',
    '3': 'secondary'
  };
}

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', 'DefinePlugin', '$', 'DeviceMode'],
  func: function InputCapture (window, config, define, $, deviceMode) {
    if (!deviceMode().supportedInput.includes('mouse')) {
      return disabledInputHandler;
    }

    let x = 0;
    let y = 0;
    const keys = {};
    const singlePressKeys = {};
    let receivedInput = false;

    function singlePress (key, alt, ctrl, shift) {
      singlePressKeys[key] = [];

      if (alt) { singlePressKeys[key].push('alt'); }
      if (ctrl) { singlePressKeys[key].push('ctrl'); }
      if (shift) { singlePressKeys[key].push('shift'); }
    }

    function press (key, alt, ctrl, shift) {
      keys[key] = [];

      if (alt) { keys[key].push('alt'); }
      if (ctrl) { keys[key].push('ctrl'); }
      if (shift) { keys[key].push('shift'); }
    }

    function release (key) {
      keys[key] = false;
    }

    function bindToWindowEvents () {
      $()(window()).on('click', function click (e) {
        singlePress(mouseMap()[e.which], e.altKey, e.ctrlKey, e.shiftKey);
        receivedInput = true;
      });

      $()(window()).on('mousedown', function mousedown (e) {
        press(mouseMap()[e.which], e.altKey, e.ctrlKey, e.shiftKey);
        e.preventDefault();
        receivedInput = true;
      });

      $()(window()).on('mouseup', function mouseup (e) {
        release(mouseMap()[e.which]);
        e.preventDefault();
        receivedInput = true;
      });

      const elementId = `#${config().client.element}`;
      $()(elementId).on('mousemove', function mousemove (e) {
        x = e.layerX;
        y = e.layerY;
        receivedInput = true;
      });
    }

    define()('OnClientStart', function () {
      return function MouseInputCapture () {
        bindToWindowEvents();
      };
    });

    return function getCurrentState () {
      const inputData = { mouse: { x, y }, receivedInput };

      const keysToSend = [];
      each(keys, function (value, key) {
        if (value) {
          keysToSend.push({key, modifiers: value});
        }
      });
      inputData.keys = keysToSend;

      const singlePressKeysToSend = [];
      each(singlePressKeys, function (value, key) {
        if (value) {
          singlePressKeysToSend.push({key, modifiers: value});
        }
        singlePressKeys[key] = false;
      });
      inputData.singlePressKeys = singlePressKeysToSend;

      receivedInput = false;

      return inputData;
    };
  }
};