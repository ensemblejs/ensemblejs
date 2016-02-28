'use strict';

import {without, each, map, includes, isEmpty, isEqual} from 'lodash';
import {getMapping, deadZones as deadZonesTable, getDeadzoneAlgorithm, axial, normaliseResult} from 'gamepad-api-mappings';
import {supportsInput} from '../../util/device-mode';
import define from '../../plugins/plug-n-play';
import {get} from '../../plugins/plug-n-play';

let logger = require('../../logging/client/logger').logger;

module.exports = {
  type: 'InputCapture',
  deps: ['Modernizr', 'Window', 'Config', 'DeviceMode'],
  func: function (modernizr, window, config, deviceMode) {
    const hasEvents = ('ongamepadconnected' in window);

    let controllers = {};
    let noStickInputCount = 0;

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
        if (!includes(supportsInput, deviceMode())) {
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

    const centered = {x: 0, y: 0};

    function sticksAreCentered(inputData) {
      return isEqual(inputData['left-stick'], centered) &&
             isEqual(inputData['right-stick'], centered);
    }

    function didWeReceiveInput (inputData) {
      return !(isEmpty(inputData.keys) &&
                   sticksAreCentered(inputData) &&
                   noStickInputCount > 1);
    }

    return function getCurrentState () {
      if (!hasEvents) {
        pollGamepads();
      }

      let inputData = {
        keys: [],
        'left-stick': {x: 0, y: 0},
        'right-stick': {x: 0, y: 0}
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
          let force = axial(button.value, deadZones[key], normaliseResult);
          inputData.keys.push({
            key: key,
            force: force
          });
        });

        var axes = map(controller.axes, axis => axis);

        each(deviceMap.axes, (axis, index) => {
          if (axis.id === 'left-stick' || axis.id === 'right-stick') {
            inputData[axis.id][axis.prop] = axes[index];
          } else {
            let force = axial(axes[index], deadZones[axis.id], normaliseResult);
            if (force > 0) {
              inputData.keys.push({
                key: axis.id,
                force: force
              });
            }
          }
        });

        const algorithm = config().client.input.gamepad.deadzoneAlgorithm;
        const mapper = config().client.input.gamepad.deadzoneMapper;

        const deadzoneAlgorithm = getDeadzoneAlgorithm(algorithm, mapper);

        if (algorithm) {
          inputData['left-stick'] = deadzoneAlgorithm(inputData['left-stick'], deadZones['left-stick']);
          inputData['right-stick'] = deadzoneAlgorithm(inputData['right-stick'], deadZones['right-stick']);
        }
      }));

      inputData.receivedInput = didWeReceiveInput(inputData);

      if (sticksAreCentered(inputData)) {
        noStickInputCount += 1;
      } else {
        noStickInputCount = 0;
      }

      return inputData;
    };
  }
};