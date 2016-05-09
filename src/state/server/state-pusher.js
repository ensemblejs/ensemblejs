'use strict';

import { each, isEqual, cloneDeep, reject } from 'lodash';

var sequence = require('distributedlife-sequence');
var config = require('../../util/config');

module.exports = {
  type: 'StatePusher',
  deps: ['RawStateAccess', 'LowestInputProcessed', 'On', 'DefinePlugin', 'Time'],
  func: function StatePusher (rawStateAccess, lowestInputProcessed, on, define, time) {

    var intervals = [];

    function skipThisPacket (current, prior) {
      return isEqual(current, prior);
    }

    function start (save, socket) {
      var lastPacket = {};
      var id;

      function updateClient () {
        var packet = {
          highestProcessedMessage: lowestInputProcessed()(save.id),
          saveState: rawStateAccess().for(save.id)
        };

        lastPacket = cloneDeep(packet);

        packet.id = sequence.next('server-origin-messages');
        packet.timestamp = time().present();

        on().outgoingServerPacket(socket.id, packet);
      }

      socket.emit('initialState', rawStateAccess().for(save.id));

      id = setInterval(updateClient, config.get().server.pushUpdateFrequency);
      intervals.push(id);

      define()('OnClientDisconnect', function OnClientDisconnect () {
        return function resetLastPacketSentAndStopPushing () {
          lastPacket = {};

          clearInterval(id);
          intervals = reject(intervals, (interval) => interval === id);
        };
      });
    }

    define()('OnServerStop', function () {
      return function stopAllPushers () {
        each(intervals, function eachInterval (interval) {
          clearInterval(interval);
        });
      };
    });

    return {
      start: start
    };
  }
};
