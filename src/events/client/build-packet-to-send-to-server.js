'use strict';

var each = require('lodash').each;
var merge = require('lodash').merge;
var isArray = require('lodash').isArray;
var cloneDeep = require('lodash').cloneDeep;
var sequence = require('distributedlife-sequence');
import {execute} from 'royal-sampler';

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

    function buildPacket () {
      if (currentState().get(paused)) {
        return null;
      }

      var packet = {
        pendingAcks: clientAcknowledgements().flush(),
      };

      each(inputCaptureMethods(), function (getCurrentState) {
        merge(packet, getCurrentState(), mergeArrays);
      });

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