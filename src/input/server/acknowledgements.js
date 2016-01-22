'use strict';

var each = require('lodash').each;
var last = require('lodash').last;
var select = require('lodash').select;
var reject = require('lodash').reject;
var unique = require('lodash').unique;
var map = require('lodash').map;
var contains = require('lodash').contains;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;
var logger = require('../../logging/server/logger').logger;
var config = require('../../util/config');

function toggleAck (players, playerId) {
  if (contains(players, playerId)) {
    return unique(reject(players, function(n) { return n === playerId;}));
  } else {
    players.push(playerId);
    return unique(players);
  }
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

    var serverAcks = [];

    function ackOnceForAll (action, ack, save, onProgress, onComplete) {
      action.players = action.players || [];
      action.fired = action.fired || false;

      if (action.fired) {
        logger.debug(action, 'Action has already fired.');
        return;
      }

      action.players = toggleAck(action.players, ack.playerId);

      if (action.players.length === config.get().maxPlayers(save.mode)) {
        logger.debug(action, 'Ack for player ' + ack.playerId + '.');
        onProgress(action);

        logger.debug(action, 'All players have ack\'d.');
        onComplete(action);

        action.fired = true;
        return true;
      } else {
        logger.debug(action, 'Ack for player ' + ack.playerId + '.');
        onProgress(action);
      }
    }

    function ackOnceAlreadyFired (action, ack) {
      if (action.fired) {
        logger.debug(action, 'Action has already fired.');
        return true;
      }

      if (contains(action.players, ack.playerId)) {
        logger.debug(action, 'Player ' + ack.playerId + ' has already fired ack.');
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

    var ackMapTypeCanFireHandler = {
      'once-for-all': ackOnceForAll,
      'every': ackEvery,
      'once-each': ackOnceEach,
      'first-only': ackFirstOnly
    };

    define()('OnIncomingClientInputPacket', function () {
      return function handleAcknowledgements (packet, save) {
        var serverAcksForSave = select(serverAcks, {saveId: save.id});
        serverAcks = reject(serverAcks, {saveId: save.id});

        var acks = packet.pendingAcks.concat(serverAcksForSave);
        acks = map(acks, function (ack) {
          ack.playerId = packet.playerId;
          return ack;
        });

        each(acks, function (ack) {
          var byMode = filterPluginsByMode(acknowledgementMaps(), save.mode);
          var hasMatchingName = select(byMode, function(ackMap) {
            return last(ackMap)[ack.name];
          });

          function onProgress (action) {
            logger.debug({ack: ack}, 'Acknowledgement progressed.');

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
            logger.debug({ack: ack}, 'Acknowledgement progressed.');

            mutate()(
              save.id,
              action.onComplete(
                state().for(save.id),
                ack,
                action.data
              )
            );
          }

          each(hasMatchingName, function(ackMap) {
            var actions = last(ackMap)[ack.name];

            each(actions, function (action) {
              ackMapTypeCanFireHandler[action.type](action, ack, save, onProgress, onComplete);
            });
          });
        });
      };
    });
  }
};