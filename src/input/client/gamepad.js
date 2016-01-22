'use strict';

import {each, map, contains} from 'lodash/collection';
import {without} from 'lodash/array';
import {getMapping, deadZones as deadZonesTable, getForce, getLinkedForce} from 'gamepad-api-mappings';
import {supportsInput} from '../../util/device-mode';

let logger = require('../../logging/client/logger').logger;
let roundPrecision = require('round-precision');

module.exports = {
  type: 'InputCapture',
  deps: ['DefinePlugin', 'Modernizr', 'Window', 'Config', 'DeviceMode'],
  func: function (define, modernizr, window, config, deviceMode) {
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

    define()('OnClientStart', function () {
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

    // define()('ActionMap', ['PauseBehaviour'], function (behaviour) {
    //   return {
    //     'start-forward': [{call: behaviour.toggle, whenWaiting: true}]
    //   };
    // });

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
          let force = getForce(button.value, deadZones[key]);
          inputData.keys.push({
            key: key,
            force: roundPrecision(force, 2)
          });
        });

        var axes = map(controller.axes, axis => {
          return roundPrecision(axis, 2);
        });

        each(deviceMap.axes, (axis, index) => {
          if (axis.id === 'leftStick' || axis.id === 'rightStick') {
            inputData[axis.id][axis.prop] = axes[index];
          } else {
            let force = getForce(axes[index], deadZones[axis.id]);
            if (force > 0) {
              inputData.keys.push({
                key: axis.id,
                force: roundPrecision(force, 2)
              });
            }
          }
        });

        // if (config().client.input.gamepad.deadzoneCalculation === 'linked') {
          inputData.leftStick = getLinkedForce(inputData.leftStick, deadZones.leftStick);
          inputData.rightStick = getLinkedForce(inputData.rightStick, deadZones.rightStick);
        // } else {
        //   inputData.leftStick.x = getForce(inputData.leftStick.x, deadZones.leftStick);
        //   inputData.leftStick.y = getForce(inputData.leftStick.y, deadZones.leftStick);
        //   inputData.rightStick.x = getForce(inputData.rightStick.x, deadZones.rightStick);
        //   inputData.rightStick.y = getForce(inputData.rightStick.y, deadZones.rightStick);
        // }
      }));

      return inputData;
    };
  }
};