'use strict';

var select = require('lodash').select;
var pluck = require('lodash').pluck;
var contains = require('lodash').contains;

module.exports = {
  type: 'InputQueue',
  deps: ['DefinePlugin', 'SaveMode', 'Time', 'Config'],
  func: function InputQueue (define, mode, time, config) {
    var inputQueue = [];
    var highestProcessedMessage = 0;

    function inputNotProcessedByServer (input) {
      return input.id > highestProcessedMessage;
    }

    define()('OnIncomingServerPacket', function OnIncomingServerPacket () {
      return function handle (packet) {
        highestProcessedMessage = packet.highestProcessedMessage || 0;
      };
    });

    define()('AfterPhysicsFrame', function AfterPhysicsFrame () {
      return function removeInputHandledByServer () {
        inputQueue = select(inputQueue, inputNotProcessedByServer);
      };
    });

    define()('OnOutgoingClientPacket', function OnOutgoingClientPacket () {
      function packetAlreadyOnQueue (packet) {
        return contains(pluck(inputQueue, 'id'), packet.id);
      }

      return function putPacketOntoInputQueue (packet) {
        if (!config().client.clientSidePrediction) {
          return;
        }
        if (packetAlreadyOnQueue(packet)) {
          return;
        }

        inputQueue.push({
          id: packet.id,
          rawData: packet,
          playerId: packet.playerId,
          timestamp: time().present(),
          save: {
            id: 'client',
            mode: mode()
          }
        });
      };
    });

    return {
      length: function length () { return inputQueue.length; },
      get: function get (i) { return inputQueue[i]; }
    };
  }
};