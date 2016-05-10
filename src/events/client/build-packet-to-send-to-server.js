'use strict';

import {merge} from 'lodash';
import {execute} from 'royal-sampler';
import {isArray} from '../../util/is';
var sequence = require('distributedlife-sequence');

module.exports = {
  type: 'BeforePhysicsFrame',
  deps: ['InputCapture', 'On', 'ClientAcknowledgements', 'CurrentState', 'Time', 'DefinePlugin', 'Config'],
  func: function BuildPacketToSendToServer (inputCaptureMethods, on, clientAcknowledgements, currentState, time, define, config) {

    let playerId;
    let deviceNumber;

    function mergeArrays (a, b) {
      if (isArray(a)) {
        return a.concat(b);
      }
    }

    function paused (state) { return state.ensemble.paused; }

    function buildPacket () {
      if (currentState().get(paused)) {
        return null;
      }

      let packet = {
        pendingAcks: clientAcknowledgements().flush(),
      };

      const getCurrentState = inputCaptureMethods();
      for(let i = 0; i < getCurrentState.length; i += 1) {
        let state = getCurrentState[i]();
        if (state.receivedInput) {
          merge(packet, state, mergeArrays);
        }
      }

      packet.id = sequence.next('client-input');
      packet.deviceNumber = deviceNumber;
      packet.playerId = playerId;
      packet.timestamp = time().present();

      return packet;
    }

    function buildPacketToSendToServer () {
      var packet = buildPacket();
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