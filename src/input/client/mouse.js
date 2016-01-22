'use strict';

var each = require('lodash').each;
var contains = require('lodash').contains;
import {supportsInput} from '../../util/device-mode';

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
    var x = 0;
    var y = 0;
    var keys = {};
    var singlePressKeys = {};

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
      });

      $()(window()).on('mousedown', function mousedown (e) {
        press(mouseMap()[e.which], e.altKey, e.ctrlKey, e.shiftKey);
        e.preventDefault();
      });

      $()(window()).on('mouseup', function mouseup (e) {
        release(mouseMap()[e.which]);
        e.preventDefault();
      });

      var elementId = '#' + config().client.element;
      $()(elementId).on('mousemove', function mousemove (e) {
        x = e.layerX;
        y = e.layerY;
      });
    }

    define()('OnClientStart', function () {
      return function MouseInputCapture () {
        if (!contains(supportsInput, deviceMode())) {
          return;
        }

        bindToWindowEvents();
      };
    });

    return function getCurrentState () {
      var inputData = {
        mouse: {
          x: x,
          y: y
        }
      };

      var keysToSend = [];
      each(keys, function (value, key) {
        if (value) {
          keysToSend.push({key: key, modifiers: value});
        }
      });
      inputData.keys = keysToSend;

      var singlePressKeysToSend = [];
      each(singlePressKeys, function (value, key) {
        if (value) {
          singlePressKeysToSend.push({key: key, modifiers: value});
        }
        singlePressKeys[key] = false;
      });
      inputData.singlePressKeys = singlePressKeysToSend;

      return inputData;
    };
  }
};