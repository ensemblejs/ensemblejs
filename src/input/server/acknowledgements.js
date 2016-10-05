'use strict';

const last = require('lodash').last;
const unique = require('lodash').uniq;
const includes = require('lodash').includes;
const filterPluginsByMode = require('../../util/modes').filterPluginsByMode;
const logger = require('../../logging/server/logger').logger;
const config = require('../../util/config');

function toggleAck (players, playerId) {
  if (includes(players, playerId)) {
    return unique(players.filter((n) => n !== playerId));
  }

  players.push(playerId);
  return unique(players);
}

function ackEvery (action, ack, save, onProgress, onComplete) {
  onComplete(action);
}

function ackFirstOnly (action, ack, save, onProgress, onComplete) {
  if (action.fired) {
    return;
  }

  action.fired = true;

  onComplete(action);
}

module.exports = {
  type: 'AcknowledgementProcessing',
  deps: ['StateMutator', 'StateAccess', 'AcknowledgementMap', 'DefinePlugin'],
  func: function AcknowledgementProcessing (mutate, state, acknowledgementMaps, define) {

    let serverAcks = [];

    function ackOnceForAll (action, ack, save, onProgress, onComplete) {
      action.players = action.players || [];
      action.fired = action.fired || false;

      if (action.fired) {
        logger.debug({action}, 'Action has already fired.');
        return false;
      }

      action.players = toggleAck(action.players, ack.playerId);

      logger.debug({action, ack}, 'Ack for player progressed.');
      if (action.players.length === config.get().maxPlayers(save.mode)) {
        onProgress(action);

        logger.debug({action}, 'All players have ack\'d.');
        onComplete(action);

        action.fired = true;
        return true;
      }

      onProgress(action);

      return false;
    }

    function ackOnceAlreadyFired (action, ack) {
      if (action.fired) {
        logger.debug({action}, 'Action has already fired.');
        return true;
      }

      if (includes(action.players, ack.playerId)) {
        logger.debug({action, ack}, 'Player has already fired ack.');
        return true;
      }

      return false;
    }

    function ackOnceEach (action, ack, save, onProgress, onComplete) {
      action.players = action.players || [];
      action.fired = action.fired || false;

      if (ackOnceAlreadyFired(action, ack)) {
        return false;
      }

      action.players.push(ack.playerId);
      action.players = unique(action.players);
      onProgress(action);

      if (action.players.length === config.get().maxPlayers(save.mode)) {
        action.fired = true;
        onComplete(action);
      }

      return true;
    }

    const ackMapTypeCanFireHandler = {
      'once-for-all': ackOnceForAll,
      'every': ackEvery,
      'once-each': ackOnceEach,
      'first-only': ackFirstOnly
    };

    define()('OnIncomingClientInputPacket', function () {
      return function handleAcknowledgements (packet, save) {
        const serverAcksForSave = serverAcks.filter((ack) => ack.saveId === save.id);
        serverAcks = serverAcks.filter((ack) => ack.saveId === save.id);

        let acks = packet.pendingAcks.concat(serverAcksForSave);
        acks = acks.map(function (ack) {
          ack.playerId = packet.playerId;
          return ack;
        });

        acks.forEach(function (ack) {
          const byMode = filterPluginsByMode(acknowledgementMaps(), save.mode);
          const hasMatchingName = byMode.filter(function(ackMap) {
            return last(ackMap)[ack.name];
          });

          function onProgress (action) {
            logger.debug({ack}, 'Acknowledgement progressed.');

            mutate()(
              save.id,
              action.onProgress(
                state().for(save.id),
                ack,
                action.players,
                action.data
              )
            );
          }

          function onComplete (action) {
            logger.debug({ack}, 'Acknowledgement complete.');

            mutate()(
              save.id,
              action.onComplete(
                state().for(save.id),
                ack,
                action.data
              )
            );
          }

          hasMatchingName.forEach(function(ackMap) {
            const actions = last(ackMap)[ack.name];

            actions.forEach(function (action) {
              ackMapTypeCanFireHandler[action.type](action, ack, save, onProgress, onComplete);
            });
          });
        });
      };
    });
  }
};