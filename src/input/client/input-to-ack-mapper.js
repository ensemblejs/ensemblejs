'use strict';

var parseKeysAndKeypresses = require('../../util/input-common').parseKeysAndKeypresses;
var parseTouches = require('../../util/input-common').parseTouches;
var parseSticks = require('../../util/input-common').parseSticks;

module.exports = {
  type: 'InputToAcknowledgementMapper',
  deps: ['DefinePlugin', 'ActionMap', 'PacketAcknowledgements', 'GameMode', 'StateAccess'],
  func: function (define, actionMaps, acknowledgements, mode, state) {
    define()('OnOutgoingClientPacket', function OnOutgoingClientPacket () {
      return function mapActionsToAcks (packet) {
        function callback (currentInput, key, action) {
          if (!action.ack) {
            return;
          }

          acknowledgements().ack(action.ack);
        }

        var currentInput = {
          rawData: packet,
          playerId: packet.playerId,
          game: {
            id: 'client',
            mode: mode()
          }
        };
        var waitingForPlayers = state().for().get('ensemble.waitingForPlayers');

        parseKeysAndKeypresses(
          actionMaps(),
          currentInput,
          waitingForPlayers,
          callback
        );
        parseTouches(
          actionMaps(),
          currentInput,
          waitingForPlayers,
          callback
        );
        parseSticks(
          actionMaps(),
          currentInput,
          waitingForPlayers,
          callback
        );
      };
    });
  }
};