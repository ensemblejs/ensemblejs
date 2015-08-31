'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var last = require('lodash').last;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

module.exports = {
  type: 'OnClientPacket',
  deps: ['AcknowledgementMap', 'GameMode', 'StateMutator', 'StateAccess'],
  func: function OnClientPacket (acknowledgementMaps, mode, mutate, state) {

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

    return function handleClientSidePacketAcknowledgements (packet) {
      if (packet.pendingAcks.length === 0) {
        return;
      }

      removeAcknowledgedPackets(packet.pendingAcks);
    };
  }
};