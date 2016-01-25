'use strict';

import {each, map, contains} from 'lodash/collection';
import {without} from 'lodash/array';
import {getMapping, deadZones as deadZonesTable, pickDeadzone, getScaledAxial} from 'gamepad-api-mappings';
import {supportsInput} from '../../util/device-mode';
import {get, define} from '../../plugins/plug-n-play';

let logger = require('../../logging/client/logger').logger;

module.exports = {
  type: 'InputCapture',
  deps: ['Modernizr', 'Window', 'Config', 'DeviceMode'],
  func: function (modernizr, window, config, deviceMode) {
    const hasEvents = ('ongamepadconnected' in window);

    let controllers = {};

    function pollGamepads() {
      var gamepads = window().navigator.getGamepads();
      each(without(gamepads, undefined), (gamepad => {
        controllers[gamepad.index] = gamepad;
      }));
    }

    function bindToWindowEvents () {
      if (!hasEvents) {
        pollGamepads();
      } else {
        window().addEventListener('gamepadconnected', event => {
          controllers[event.gamepad.index] = event.gamepad;
        }, false);

        window().addEventListener('gamepaddisconnected', event => {
          delete controllers[event.gamepad.index];
        }, false);
      }
    }

    define('OnClientStart', function () {
      return function KeyboardInputCapture () {
        if (!modernizr().gamepads) {
          return;
        }
        if (!contains(supportsInput, deviceMode())) {
          return;
        }

        logger.info('Gamepad supported by device');

        bindToWindowEvents();
      };
    });

    define('ActionMap', function () {
      return {
        'start-forward': [{
          call: get('PauseBehaviour', 'toggle'), whenWaiting: true
        }]
      };
    });

    return function getCurrentState () {
      if (!hasEvents) {
        pollGamepads();
      }

      let inputData = {
        keys: [],
        leftStick: {x: 0, y: 0},
        rightStick: {x: 0, y: 0}
      };

      controllers = without(controllers, undefined);
      each(controllers, (controller => {
        let deviceMap = getMapping(controller.id, controller.mapping);
        let deadZones = deadZonesTable[deviceMap.deadZone];

        each(controller.buttons, (button, index) => {
          if (!button.pressed) {
            return;
          }

          let key = deviceMap.buttons[index];
          let force = getScaledAxial(button.value, deadZones[key]);
          inputData.keys.push({
            key: key,
            force: force
          });
        });

        var axes = map(controller.axes, axis => axis);

        each(deviceMap.axes, (axis, index) => {
          if (axis.id === 'leftStick' || axis.id === 'rightStick') {
            inputData[axis.id][axis.prop] = axes[index];
          } else {
            let force = getScaledAxial(axes[index], deadZones[axis.id]);
            if (force > 0) {
              inputData.keys.push({
                key: axis.id,
                force: force
              });
            }
          }
        });

        if (config().client.input.gamepad.deadzoneCalculation) {
          const method = config().client.input.gamepad.deadzoneCalculation;
          inputData.leftStick = pickDeadzone(method)(inputData.leftStick, deadZones.leftStick);
          inputData.rightStick = pickDeadzone(method)(inputData.rightStick, deadZones.rightStick);
        }
      }));

      return inputData;
    };
  }
};