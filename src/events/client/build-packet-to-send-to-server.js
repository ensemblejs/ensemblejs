'use strict';

var each = require('lodash').each;
var merge = require('lodash').merge;
var isArray = require('lodash').isArray;
var cloneDeep = require('lodash').cloneDeep;
var sequence = require('distributedlife-sequence');
var paused = require('../../util/state').paused;
var interval = require('../../util/interval');

module.exports = {
  type: 'OnPhysicsFrameAlways',
  deps: ['InputCapture', 'On', 'PacketAcknowledgements', 'CurrentState', 'Time', 'DefinePlugin'],
  func: function OnPhysicsFrame (inputCaptureMethods, on, packetAcknowledgements, currentState, time, define) {
    var lastPacket = {};
    var playerId;

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

      lastPacket = cloneDeep(packet);
      packet.id = sequence.next('client-input');
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
      return function setPlayerId (id) {
        playerId = id;
      };
    });

    return interval.execute(buildPacketToSendToServer).about(120).timesPer.second();
  }
};