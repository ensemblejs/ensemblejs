'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var last = require('lodash').last;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

module.exports = {
  type: 'OnOutgoingClientPacket',
  deps: ['AcknowledgementMap', 'SaveMode', 'StateMutator', 'StateAccess'],
  func: function OnOutgoingClientPacket (acknowledgementMaps, mode, mutate, state) {

    function filterUndefinedAckName (acknowledgementMaps, ack) {
      filter(acknowledgementMaps, function (map) {
        return last(map)[ack.name] !== undefined;
      });
    }

    function removeAcknowledgedPackets (pendingAcknowledgements) {
      each(pendingAcknowledgements, function (ack) {
        var applicableMaps = filterPluginsByMode(acknowledgementMaps(), mode());
        applicableMaps = filterUndefinedAckName(applicableMaps, ack);
        each(applicableMaps, function(acknowledgementMap) {
          each(last(acknowledgementMap)[ack.name], function (action) {
            mutate()(
              'client',
              action.target(state().for(), ack, action.data));
          });
        });
      });
    }

    return function handleClientAcknowledgements (packet) {
      if (packet.pendingAcks.length === 0) {
        return;
      }

      removeAcknowledgedPackets(packet.pendingAcks);
    };
  }
};