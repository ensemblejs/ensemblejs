'use strict';

var each = require('lodash').each;
var merge = require('lodash').merge;
var isArray = require('lodash').isArray;
var cloneDeep = require('lodash').cloneDeep;
var sequence = require('distributedlife-sequence');
var interval = require('../../util/interval');

module.exports = {
  type: 'BeforePhysicsFrame',
  deps: ['InputCapture', 'On', 'ClientAcknowledgements', 'CurrentState', 'Time', 'DefinePlugin', 'Config'],
  func: function BuildPacketToSendToServer (inputCaptureMethods, on, clientAcknowledgements, currentState, time, define, config) {

    var lastPacket = {};
    var playerId;

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

    return interval.execute(buildPacketToSendToServer).every(config().server.pushUpdateFrequency).seconds();
  }
};