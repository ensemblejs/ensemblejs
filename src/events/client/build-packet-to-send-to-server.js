'use strict';

var each = require('lodash').each;
var merge = require('lodash').merge;
var isArray = require('lodash').isArray;
// var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var sequence = require('distributedlife-sequence');
var interval = require('../../util/interval');

module.exports = {
  type: 'BeforePhysicsFrame',
  deps: ['InputCapture', 'On', 'ClientAcknowledgements', 'CurrentState', 'Time', 'DefinePlugin', 'Config'],
  func: function BuildPacketToSendToServer (inputCaptureMethods, on, clientAcknowledgements, currentState, time, define, config) {

    var playerId;
    var lastPacket = { mouse: {} };
    // var atLeastOnePacketSent = false;
    // var emptyPacketSansMouse = {
    //   keys: [],
    //   leftStick: { x: 0, y: 0},
    //   mouse: {},
    //   pendingAcks: [],
    //   rightStick: { x: 0, y: 0},
    //   singlePressKeys: [],
    //   touches: []
    // };

    function mergeArrays (a, b) {
      if (isArray(a)) {
        return a.concat(b);
      }
    }

    function paused (state) { return state.ensemble.paused; }

    // function noNewInput (packet, emptyPacketSansMouse) {
    //   return isEqual(packet, emptyPacketSansMouse);
    // }

    // function skippablePacket (packet, lastPacket, emptyPacketSansMouse) {
    //   emptyPacketSansMouse.mouse = lastPacket.mouse;

    //   return atLeastOnePacketSent && noNewInput(packet, emptyPacketSansMouse);
    // }

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

      // if (skippablePacket(packet, lastPacket, emptyPacketSansMouse)) {
      //   return undefined;
      // }

      lastPacket = cloneDeep(packet);
      // atLeastOnePacketSent = true;
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