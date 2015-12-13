'use strict';

var each = require('lodash').each;
var select = require('lodash').select;
var reject = require('lodash').reject;
var isString = require('lodash').isString;
var forEachMode = require('../../util/modes').forEachMode;
var replaceIfPresent = require('../../util/replace-if-present');
var set = require('lodash').set;
var sequence = require('distributedlife-sequence');

module.exports = {
  type: 'PhysicsSystemBridge',
  deps: ['DefinePlugin', 'PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function PhysicsSystemBridge (define, allMaps, tracker, physicsSystem, state) {

    function wireupDynamic (gameId, physicsKey, sourceKey) {
      physicsSystem().register(gameId, physicsKey, sourceKey, state().for(gameId).unwrap(sourceKey));
      tracker().for(gameId).onChangeOf(sourceKey, physicsSystem().updated(gameId, physicsKey));
    }

    function wireupStatic (gameId, physicsKey, source) {
      physicsSystem().register(gameId, physicsKey, 'static' + sequence.next('static-physics'), source);
    }

    function OnGameReady () {
      return function wireupPhysicsMap (game) {

        function loadPhysicsMap (map) {
          each(map, function(sources, physicsKey) {
            each(select(sources, isString), function(sourceKey) {
              wireupDynamic(game.id, physicsKey, sourceKey);
            });
            each(reject(sources, isString), function(sourceKey) {
              wireupStatic(game.id, physicsKey, sourceKey);
            });
          });
        }

        forEachMode(allMaps(), game.mode, loadPhysicsMap);
      };
    }

    function OnPhysicsFrame () {
      return function tickPhysicsSimulation (state, delta) {
        var changes = physicsSystem().tick(delta);

        if (!changes) {
          return;
        }
        if (changes.length === 0) {
          return;
        }

        var newState = {};
        each(changes, function (stateKey) {
          var gameState = state.unwrap(stateKey);
          var physicsState = physicsSystem().get(stateKey);

          set(newState, stateKey, replaceIfPresent(gameState, physicsState));
        });

        return newState;
      };
    }

    define()('OnGameReady', OnGameReady);
    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};