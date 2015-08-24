'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
var first = require('lodash').first;
var last = require('lodash').last;
var intersection = require('lodash').intersection;

module.exports = {
  type: 'OnClientPacket',
  deps: ['AcknowledgementMap', 'GameMode', 'StateMutator', 'StateAccess'],
  func: function OnClientPacket (acknowledgementMaps, mode, mutate, state) {

    //TODO: utility this
    function isApplicable (callback) {
      return intersection(['*', mode()], first(callback)).length > 0;
    }

    function removeAcknowledgedPackets (pendingAcknowledgements) {
      each(pendingAcknowledgements, function (ack) {
        var applicableMaps = filter(acknowledgementMaps(), function(ackMap) {
          return isApplicable(ackMap);
        });

        each(applicableMaps, function(acknowledgementMap) {
          if (last(acknowledgementMap)[ack.name] === undefined) {
            return;
          }

          each(last(acknowledgementMap)[ack.name], function (action) {
            mutate()(
              'ignore',
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