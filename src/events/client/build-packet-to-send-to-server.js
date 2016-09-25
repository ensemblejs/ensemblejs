'use strict';

import {merge} from 'lodash';
import {execute} from 'royal-sampler';
import {isArray} from '../../util/is';
import {join} from '../../util/array';
import read from 'ok-selector';

const sequence = require('distributedlife-sequence');

module.exports = {
  type: 'BeforePhysicsFrame',
  deps: ['InputCapture', 'On', 'ClientAcknowledgements', 'CurrentState', 'Time', 'DefinePlugin', 'Config', 'FrameStore', 'Player', 'Device'],
  func: function BuildPacketToSendToServer (inputCaptureMethods, on, clientAcknowledgements, currentState, time, define, config, frameStore, player, device) {

    const mergeArrays = (a, b) => isArray(a) ? join(a, b) : undefined;
    const paused = (state) => read(state, 'ensemble.paused');

    function buildPacket () {
      if (currentState().get(paused)) {
        return null;
      }

      const packet = {
        id: sequence.next('client-input'),
        deviceNumber: device().number(),
        playerId: player().id(),
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

    return execute(buildPacketToSendToServer).every(config().server.pushUpdateFrequency).milliseconds();
  }
};