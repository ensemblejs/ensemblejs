'use strict';

var each = require('lodash').each;
var last = require('lodash').last;
var select = require('lodash').select;
var unique = require('lodash').unique;
var contains = require('lodash').contains;
var filterPluginsByMode = require('../../util/modes').filterPluginsByMode;

module.exports = {
  type: 'OnIncomingClientInputPacket',
  deps: ['Config', 'StateMutator', 'StateAccess', 'AcknowledgementMap', 'Logger'],
  func: function OnIncomingClientInputPacket (config, mutate, state, acknowledgementMaps, logger) {

    function ackOnceForAll (action, ack, game) {
      action.players = action.players || [];
      action.fired = action.fired || false;

      if (action.fired) {
        return false;
      }

      action.players.push(ack.playerId);
      action.players = unique(action.players);

      if (action.players.length === config().maxPlayers(game.mode)) {
        action.fired = true;
        return true;
      } else {
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

    return function handleAcknowledgements (packet, game) {
      var acks = packet.pendingAcks;

      each(acks, function (ack) {
        var byMode = filterPluginsByMode(acknowledgementMaps(), game.mode);
        var hasMatchingName = select(byMode, function(ackMap) {
          return last(ackMap)[ack.name];
        });

        each(hasMatchingName, function(ackMap) {
          var actions = last(ackMap)[ack.name];
          var toFire = select(actions, function (action) {
            return ackMapTypeCanFireHandler[action.type](action, ack, game);
          });

          each(toFire, function (action) {
            logger().debug('Acknowledgement "' + ack.name + '" called.');

            mutate()(
              game.id,
              action.target(state().for(game.id),
              ack,
              action.data
            ));
          });
        });
      });
    };
  }
};