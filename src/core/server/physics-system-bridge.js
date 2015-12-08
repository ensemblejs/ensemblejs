'use strict';

var each = require('lodash').each;
var select = require('lodash').select;
var reject = require('lodash').reject;
var isString = require('lodash').isString;
var forEachMode = require('../../util/modes').forEachMode;

module.exports = {
  type: 'PhysicsSystemBridge',
  deps: ['DefinePlugin', 'PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function OnGameReady (define, allMaps, tracker, physicsSystem, state) {

    function wireupDynamic (gameId, key, source) {
      physicsSystem().create(gameId, key, state().for(gameId).unwrap(source));
      tracker().for(gameId).onChangeOf(source, physicsSystem().updated(gameId, key));
    }

    function wireupStatic (gameId, key, source) {
      physicsSystem().create(gameId, key, source);
    }

    define()('OnGameReady', function PhysicsSystemBridge () {
      return function wireupPhysicsMap (game) {

        function loadPhysicsMap (map) {
          each(map, function(sources, key) {
            each(select(sources, isString), function(source) {
              wireupDynamic(game.id, key, source);
            });
            each(reject(sources, isString), function(source) {
              wireupStatic(game.id, key, source);
            });
          });
        }

        forEachMode(allMaps(), game.mode, loadPhysicsMap);
      };
    });
  }
};