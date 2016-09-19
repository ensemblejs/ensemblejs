'use strict';

import { each, reject } from 'lodash';

const sequence = require('distributedlife-sequence');
const config = require('../../util/config');
const setFixedInterval = require('fixed-setinterval');

import { getBySaveAndDevice } from '../../util/tracking-device-input-received';

module.exports = {
  type: 'StatePusher',
  deps: ['RawStateAccess', 'On', 'DefinePlugin', 'Time'],
  func: function StatePusher (rawStateAccess, on, define, time) {
    let intervals = [];

    const changesToPush = {};

    function start (save, socket, deviceId) {
      function updateClient () {
        const changes = rawStateAccess().flush(save.id);
        Object.keys(changesToPush).forEach((saveId) => {
          changesToPush[saveId].push(...changes);
        })

        const packet = {
          measure: time().precise(),
          id: sequence.next('server-origin-messages'),
          timestamp: time().present(),
          highestProcessedMessage: getBySaveAndDevice(save.id, deviceId),
          changeDeltas: changesToPush[save.id].splice(0)
        };

        on().outgoingServerPacket(socket.id, packet);
      }

      changesToPush[save.id] = [];

      socket.emit('initialState', rawStateAccess().snapshot(save.id));

      const cancel = setFixedInterval(updateClient, config.get().server.pushUpdateFrequency);
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

    return { start };
  }
};
