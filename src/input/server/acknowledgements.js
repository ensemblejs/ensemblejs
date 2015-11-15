'use strict';

var each = require('lodash').each;
var last = require('lodash').last;
var select = require('lodash').select;
var reject = require('lodash').reject;
var unique = require('lodash').unique;
var contains = require('lodash').contains;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

module.exports = {
  type: 'OnIncomingClientInputPacket',
  deps: ['Config', 'StateMutator', 'StateAccess', 'AcknowledgementMap', 'Logger'],
  func: function OnIncomingClientInputPacket (config, mutate, state, acknowledgementMaps, logger) {

    function toggleAck (players, playerId) {
      if (contains(players, playerId)) {
        return unique(reject(players, function(n) { return n === playerId;}));
      } else {
        players.push(playerId);
        return unique(players);
      }
    }

    function ackOnceForAll (action, ack, game) {
      action.players = action.players || [];
      action.fired = action.fired || false;

      if (action.fired) {
        logger().trace(action, 'Action has already fired.');
        return false;
      }

      action.players = toggleAck(action.players, ack.playerId);

      if (action.players.length === config().maxPlayers(game.mode)) {
        action.fired = true;
        logger().trace(action, 'All players have ack\'d.');
        return true;
      } else {
        logger().trace(action, 'Not all players have ack\'d.');
        return false;
      }
    }

    function ackEvery () {
      return true;
    }

    function ackOnceEach (action, ack) {
      action.players = action.players || [];

      if (contains(action.players, ack.playerId)) {
        return false;
      }

      action.players.push(ack.playerId);
      action.players = unique(action.players);

      return true;
    }

    function ackFirstOnly (action) {
      if (action.fired) {
        return false;
      }

      action.fired = true;
      return true;
    }

    var ackMapTypeCanFireHandler = {
      'once-for-all': ackOnceForAll,
      'every': ackEvery,
      'once-each': ackOnceEach,
      'first-only': ackFirstOnly
    };

    function shouldFireProgressAck (action) {
      return !action.onProgress || action.fired;
    }

    return function handleAcknowledgements (packet, game) {
      var acks = packet.pendingAcks;

      each(acks, function (ack) {
        var byMode = filterPluginsByMode(acknowledgementMaps(), game.mode);
        var hasMatchingName = select(byMode, function(ackMap) {
          return last(ackMap)[ack.name];
        });

        each(hasMatchingName, function(ackMap) {
          var actions = last(ackMap)[ack.name];

          var toFireProgress = reject(actions, shouldFireProgressAck);

          var toFire = select(actions, function shouldFireCompleteAck (action) {
            return ackMapTypeCanFireHandler[action.type](action, ack, game);
          });

          each(toFire, function (action) {
            logger().debug('Acknowledgement "' + ack.name + '" complete.');

            mutate()(
              game.id,
              action.onComplete(
                state().for(game.id),
                ack,
                action.data
              )
            );
          });
          each(toFireProgress, function (action) {
            logger().debug('Acknowledgement "' + ack.name + '" progressed.');

            mutate()(
              game.id,
              action.onProgress(
                state().for(game.id),
                ack,
                action.players,
                action.data
              )
            );
          });
        });
      });
    };
  }
};