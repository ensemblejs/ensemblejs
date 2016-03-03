'use strict';

import {each, merge, isArray, isEqual, cloneDeep} from 'lodash';
import {execute} from 'royal-sampler';
var sequence = require('distributedlife-sequence');

module.exports = {
  type: 'BeforePhysicsFrame',
  deps: ['InputCapture', 'On', 'ClientAcknowledgements', 'CurrentState', 'Time', 'DefinePlugin', 'Config'],
  func: function BuildPacketToSendToServer (inputCaptureMethods, on, clientAcknowledgements, currentState, time, define, config) {

    var playerId;
    var deviceNumber;
    var lastPacket = { mouse: {} };

    function mergeArrays (a, b) {
      if (isArray(a)) {
        return a.concat(b);
      }
    }

    function paused (state) { return state.ensemble.paused; }

    function noInput (packet) {
      return isEqual(packet, {pendingAcks: []});
    }

    function buildPacket () {
      if (currentState().get(paused)) {
        return null;
      }

      var packet = {
        pendingAcks: clientAcknowledgements().flush(),
      };

      each(inputCaptureMethods(), function (getCurrentState) {
        var state = getCurrentState();

        if (state.receivedInput) {
          merge(packet, state, mergeArrays);
        }
      });

      if (noInput(packet)) {
        return null;
      }

      lastPacket = cloneDeep(packet);
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