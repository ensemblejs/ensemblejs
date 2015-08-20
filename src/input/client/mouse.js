'use strict';

module.exports = {
  deps: ['Window', 'Config'],
  type: 'InputCapture',
  func: function InputCapture (window, config) {
    var each = require('lodash').each;
    var $ = require('zepto-browserify').$;

    var x = 0;
    var y = 0;
    var keys = {};
    var singlePressKeys = {};

    function mouseMap () {
      return {
        '1': 'primary',
        '2': 'tertiary',
        '3': 'secondary'
      };
    }

    function singlePress (key, alt, ctrl, shift) {
      singlePressKeys[key] = [];

      if (alt) { singlePressKeys[key].push('alt'); }
      if (ctrl) { singlePressKeys[key].push('ctrl'); }
      if (shift) { singlePressKeys[key].push('shift'); }
    }

    function press (key, alt, ctrl, shift) {
      keys[key] = [];

      if (alt) { singlePressKeys[key].push('alt'); }
      if (ctrl) { singlePressKeys[key].push('ctrl'); }
      if (shift) { singlePressKeys[key].push('shift'); }
    }

    function release (key) {
      keys[key] = false;
    }

    function bindToWindowEvents () {
      $(window()).on('click', function (e) {
        singlePress(mouseMap()[e.which], e.altKey, e.ctrlKey, e.shiftKey);
      });

      $(window()).on('mousedown', function (e) {
        press(mouseMap()[e.which], e.altKey, e.ctrlKey, e.shiftKey);
        e.preventDefault();
      });

      $(window()).on('mouseup', function (e) {
        release(mouseMap()[e.which]);
        e.preventDefault();
      });

      var elementId = '#' + config().client.element;
      $(elementId).on('mousemove', function (e) {
        x = e.layerX;
        y = e.layerY;
      });
    }

    bindToWindowEvents();

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