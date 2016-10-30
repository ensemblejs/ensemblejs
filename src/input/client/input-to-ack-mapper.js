'use strict';

const parseKeysAndKeypresses = require('../../util/input-common').parseKeysAndKeypresses;
const parseTouches = require('../../util/input-common').parseTouches;
const parseSticks = require('../../util/input-common').parseSticks;

module.exports = {
  type: 'InputToAcknowledgementMapper',
  deps: ['DefinePlugin', 'ActionMap', 'ClientAcknowledgements', 'SaveMode', 'StateAccess'],
  func: function (define, actionMaps, acknowledgements, mode, state) {
    define()('OnOutgoingClientPacket', function OnOutgoingClientPacket () {
      return function mapActionsToAcks (packet) {
        function callback (currentInput, key, action) {
          if (!action.ack) {
            return;
          }

          acknowledgements().ack(action.ack);
        }

        const currentInput = {
          rawData: packet,
          playerId: packet.playerId,
          save: {
            id: 'client',
            mode: mode()
          }
        };
        const waitingForPlayers = state().for().get('ensemble.waitingForPlayers');

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