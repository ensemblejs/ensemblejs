'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'DefinePlugin', '$'],
  func: function InputCapture (window, define, $) {
    var keys = {};
    var singlePressKeys = {};

    function singlePress (key) {
      singlePressKeys[key] = true;
    }

    function press (key) {
      keys[key] = true;
    }

    function release (key) {
      keys[key] = false;
    }

    function handleClickOrTouch (func, value, e) {
      func(value);
      e.preventDefault();
      e.stopPropagation();
    }

    function addTouchBindings (element) {
      var action = element.data('action');

      element.on('touchstart', function (e) {
        handleClickOrTouch(press, action, e);
      });
      element.on('touchend', function (e) {
        handleClickOrTouch(release, action, e);
      });
      element.on('touchcancel', function (e) {
        handleClickOrTouch(release, action, e);
      });
      element.on('touchleave', function (e) {
        handleClickOrTouch(release, action, e);
      });
    }

    function addMouseBindings(element) {
      var action = element.data('action');

      element.on('mousedown', function (e) {
        handleClickOrTouch(press, action, e);
      });
      element.on('mouseup', function (e) {
        handleClickOrTouch(release, action, e);
      });
      element.on('click', function (e) {
        handleClickOrTouch(singlePress, action, e);
      });
    }

    function addBindings() {
      if (window().ontouchstart !== undefined) {
        addTouchBindings($()(this));
      }

      //jshint strict: false
      addMouseBindings($()(this));
    }

    function bindToElement (element) {
      element.each(addBindings);
    }

    define()('AnchorAction', function () {
      return {
        add: bindToElement
      };
    });

    return function getCurrentState () {
      var inputData = {};

      var keysToSend = [];
      each(keys, function (value, key) {
        if (value) {
          keysToSend.push({key: key, modifiers: []});
        }
      });
      inputData.keys = keysToSend;

      var singlePressKeysToSend = [];
      each(singlePressKeys, function (value, key) {
        if (value) {
          singlePressKeysToSend.push({key: key, modifiers: []});
        }
        singlePressKeys[key] = false;
      });
      inputData.singlePressKeys = singlePressKeysToSend;

      return inputData;
    };
  }
};