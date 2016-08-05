'use strict';

import { each, reject } from 'lodash';

var sequence = require('distributedlife-sequence');
var config = require('../../util/config');
const setFixedInterval = require('fixed-setinterval');

module.exports = {
  type: 'StatePusher',
  deps: ['RawStateAccess', 'LowestInputProcessed', 'On', 'DefinePlugin', 'Time'],
  func: function StatePusher (rawStateAccess, lowestInputProcessed, on, define, time) {

    var intervals = [];

    function start (save, socket) {
      var cancel;

      function updateClient () {
        var packet = {
          measure: time().precise(),
          id: sequence.next('server-origin-messages'),
          timestamp: time().present(),
          highestProcessedMessage: lowestInputProcessed()(save.id),
          changeDeltas: rawStateAccess().flush(save.id)
        };

        on().outgoingServerPacket(socket.id, packet);
      }

      socket.emit('initialState', rawStateAccess().snapshot(save.id));

      cancel = setFixedInterval(updateClient, config.get().server.pushUpdateFrequency);
      intervals.push(cancel);

      define()('OnClientDisconnect', function OnClientDisconnect () {
        return function resetLastPacketSentAndStopPushing () {
          cancel();
          intervals = reject(intervals, (interval) => interval === cancel);
        };
      });
    }

    define()('OnServerStop', function () {
      return function stopAllPushers () {
        each(intervals, function eachInterval (cancel) {
          cancel();
        });
      };
    });

    return {
      start: start
    };
  }
};
