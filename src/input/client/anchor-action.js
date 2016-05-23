'use strict';

import {each, includes, isEmpty} from 'lodash';
let logger = require('../../logging/client/logger').logger;
import {supportsInput} from '../../util/device-mode';

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'DefinePlugin', '$', 'DeviceMode'],
  func: function InputCapture (window, define, $, deviceMode) {
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
      if (!value) {
        console.log(e);
        logger.warn({value}, 'No action found for AnchorAction');
      }

      func(value);
      e.preventDefault();
      e.stopPropagation();
    }

    function addTouchBindings (element) {
      const action = element.data('action');

      element.on('touchstart', e => handleClickOrTouch(press, action, e));
      element.on('touchend', e => handleClickOrTouch(release, action, e));
      element.on('touchcancel', e => handleClickOrTouch(release, action, e));
      element.on('touchleave', e => handleClickOrTouch(release, action, e));
    }

    function addMouseBindings(element) {
      const action = element.data('action');

      element.on('mousedown', e => handleClickOrTouch(press, action, e));
      element.on('mouseup', e => handleClickOrTouch(release, action, e));
      element.on('click', e => handleClickOrTouch(singlePress, action, e));
    }

    function addBindings() {
      if (window().ontouchstart !== undefined) {
        addTouchBindings($()(this)); //jshint ignore:line
      }

      addMouseBindings($()(this)); //jshint ignore:line
    }

    function bindToElement (element) {
      if (!includes(supportsInput, deviceMode())) {
        logger.warn({element: element}, 'AnchorAction add called on display that does not support input');
        return;
      }

      element.each(addBindings);
    }

    define()('AnchorAction', function () {
      return {
        add: bindToElement
      };
    });

    return function getCurrentState () {
      var inputData = {
        receivedInput: false
      };

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
      inputData.receivedInput = !isEmpty(keysToSend) || !isEmpty(singlePressKeysToSend);

      return inputData;
    };
  }
};