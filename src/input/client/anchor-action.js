'use strict';

import {each, isEmpty} from 'lodash';
const logger = require('../../logging/client/logger').logger;

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'DefinePlugin', '$', 'DeviceMode'],
  func: function InputCapture (window, define, $, deviceMode) {
    const keys = {};
    const singlePressKeys = {};

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
      if (!value) {
        logger.warn({value}, 'No action found for AnchorAction');
      }

      func(value);
      e.preventDefault();
      e.stopPropagation();
    }

    function addTouchBindings () {
      if (window().ontouchstart !== undefined) {
        return;
      }

      const element = $()(this);
      const action = element.data('action');

      element.on('touchstart', (e) => handleClickOrTouch(press, action, e));
      element.on('touchend', (e) => handleClickOrTouch(release, action, e));
      element.on('touchcancel', (e) => handleClickOrTouch(release, action, e));
      element.on('touchleave', (e) => handleClickOrTouch(release, action, e));
    }

    function addMouseBindings() {
      const element = $()(this);
      const action = element.data('action');

      element.on('mousedown', (e) => handleClickOrTouch(press, action, e));
      element.on('mouseup', (e) => handleClickOrTouch(release, action, e));
      element.on('click', (e) => handleClickOrTouch(singlePress, action, e));
    }

    function bindToElement (element) {
      const supportedInput = deviceMode().supportedInput;
      if (!supportedInput.includes('touch') && !supportedInput.includes('mouse')) {
        logger.warn({ element }, 'AnchorAction add called on device that does not support touch or mouse input');
        return;
      }

      if (supportedInput.includes('touch')) {
        element.each(addTouchBindings);
      }
      if (supportedInput.includes('mouse')) {
        element.each(addMouseBindings);
      }
    }

    define()('AnchorAction', function () {
      return {
        add: bindToElement
      };
    });

    return function getCurrentState () {
      const inputData = {
        receivedInput: false
      };

      const keysToSend = [];
      each(keys, function (value, key) {
        if (value) {
          keysToSend.push({ key, modifiers: [] });
        }
      });
      inputData.keys = keysToSend;

      const singlePressKeysToSend = [];
      each(singlePressKeys, function (value, key) {
        if (value) {
          singlePressKeysToSend.push({ key, modifiers: [] });
        }
        singlePressKeys[key] = false;
      });
      inputData.singlePressKeys = singlePressKeysToSend;
      inputData.receivedInput = !isEmpty(keysToSend) || !isEmpty(singlePressKeysToSend);

      return inputData;
    };
  }
};