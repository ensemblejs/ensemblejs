'use strict';

var each = require('lodash').each;
var merge = require('lodash').merge;
var isEqual = require('lodash').isEqual;
var isArray = require('lodash').isArray;
var cloneDeep = require('lodash').cloneDeep;
var sequence = require('distributedlife-sequence');
var paused = require('../../util/state').paused;
var interval = require('../../util/interval');

module.exports = {
  type: 'OnPhysicsFrame',
  deps: ['InputCapture', 'On', 'PacketAcknowledgements', 'CurrentState', 'Time'],
  func: function OnPhysicsFrame (inputCaptureMethods, on, packetAcknowledgements, currentState, time) {
    var lastPacket = {};

    function packetHasNotChanged (current, prior) {
      return isEqual(current, prior);
    }

    function mergeArrays (a, b) {
      if (isArray(a)) {
        return a.concat(b);
      }
    }

    function buildPacket () {
      if (currentState().get(paused)) {
        return null;
      }

      var packet = {
        pendingAcks: packetAcknowledgements().flush(),
      };

      each(inputCaptureMethods(), function (getCurrentState) {
        merge(packet, getCurrentState(), mergeArrays);
      });

      if (packetHasNotChanged(packet, lastPacket)) {
        return null;
      }

      lastPacket = cloneDeep(packet);
      packet.id = sequence.next('client-input');
      packet.timestamp = time().present();

      return packet;
    }

    function buildPacketToSendToServer () {
      var packet = buildPacket();
      if (packet) {
        on().outgoingClientPacket(packet);
      }
    }

    return interval.execute(buildPacketToSendToServer).about(120).timesPer.second();
  }
};