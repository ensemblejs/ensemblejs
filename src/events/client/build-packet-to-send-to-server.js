'use strict';

import {merge} from 'lodash';
import {execute} from 'royal-sampler';
import {isArray} from '../../util/is';
import {join} from '../../util/array';
import read from 'ok-selector';

const sequence = require('distributedlife-sequence');

module.exports = {
  type: 'BeforePhysicsFrame',
  deps: ['InputCapture', 'On', 'ClientAcknowledgements', 'CurrentState', 'Time', 'DefinePlugin', 'Config', 'FrameStore'],
  func: function BuildPacketToSendToServer (inputCaptureMethods, on, clientAcknowledgements, currentState, time, define, config, frameStore) {

    let playerId;
    let deviceNumber;

    const mergeArrays = (a, b) => isArray(a) ? join(a, b) : undefined;
    const paused = (state) => read(state, 'ensemble.paused');

    function buildPacket () {
      if (currentState().get(paused)) {
        return null;
      }

      const packet = {
        id: sequence.next('client-input'),
        deviceNumber,
        playerId,
        timestamp: time().present(),
        clientFrame: frameStore().current().id,
        pendingAcks: clientAcknowledgements().flush()
      };

      const getCurrentState = inputCaptureMethods();
      for(let i = 0; i < getCurrentState.length; i += 1) {
        const state = getCurrentState[i]();
        if (state.receivedInput) {
          merge(packet, state, mergeArrays);
        }
      }

      return packet;
    }

    function buildPacketToSendToServer () {
      const packet = buildPacket();
      if (packet) {
        on().outgoingClientPacket(packet);
      }
    }

    define()('OnClientPlayerId', function () {
      return function setPlayerNumber (number) {
        playerId = number;
      };
    });

    define()('OnClientDeviceNumber', function () {
      return function setDeviceNumber (number) {
        deviceNumber = number;
      };
    });

    return execute(buildPacketToSendToServer).every(config().server.pushUpdateFrequency).milliseconds();
  }
};