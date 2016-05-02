'use strict';

import { filter, map, includes, reject } from 'lodash';

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
        highestProcessedMessage = packet.highestProcessedMessage;
      };
    });

    define()('AfterPhysicsFrame', function AfterPhysicsFrame () {
      return function removeInputHandledByServer () {
        inputQueue = filter(inputQueue, inputNotProcessedByServer);
      };
    });

    function HandlePacketLocally () {
      function packetAlreadyOnQueue (packet) {
        return includes(map(inputQueue, 'id'), packet.id);
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
    }

    define()('OnOutgoingClientPacket', HandlePacketLocally);
    // define()('OnIncomingPeerPacket', function HandlePacketLocally () {
    //   function packetAlreadyOnQueue (packet) {
    //     return includes(map(inputQueue, 'id'), packet.id);
    //   }

    //   return function putPacketOntoInputQueue (packet) {
    //     if (!config().client.clientSidePrediction) {
    //       return;
    //     }

    //     if (packetAlreadyOnQueue(packet)) {
    //       return;
    //     }

    //     inputQueue.push({
    //       id: packet.id,
    //       rawData: packet,
    //       playerId: packet.playerId,
    //       timestamp: time().present(),
    //       save: {
    //         id: 'client',
    //         mode: mode()
    //       }
    //     });
    //   };
    // });

    return {
      length: function length () { return inputQueue.length; },
      get: function get (i) { return inputQueue[i]; }
    };
  }
};