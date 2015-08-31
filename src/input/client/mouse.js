'use strict';

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'Config', 'DefinePlugin'],
  func: function InputCapture (window, config, define) {
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
      $(window()).on('click', function click (e) {
        singlePress(mouseMap()[e.which], e.altKey, e.ctrlKey, e.shiftKey);
      });

      $(window()).on('mousedown', function mousedown (e) {
        press(mouseMap()[e.which], e.altKey, e.ctrlKey, e.shiftKey);
        e.preventDefault();
      });

      $(window()).on('mouseup', function mouseup (e) {
        release(mouseMap()[e.which]);
        e.preventDefault();
      });

      var elementId = '#' + config().client.element;
      $(elementId).on('mousemove', function mousemove (e) {
        x = e.layerX;
        y = e.layerY;
      });
    }

    define()('OnSetup', function () {
      return function MouseInputCapture () {
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