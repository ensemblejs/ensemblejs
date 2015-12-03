'use strict';

var each = require('lodash').each;
var isString = require('lodash').isString;

module.exports = {
  type: 'OnGameReady',
  deps: ['PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function OnGameReady (physicsMap, tracker, physicsSystem, state) {
    return function wireupPhysicsMap (game) {
      function wireupDynamic (key, source) {
        physicsSystem().create(key, state().for(game.id).unwrap(source));
        tracker().for(game.id).onChangeOf(source, physicsSystem().updated(key));
      }

      function wireupStatic (key, source) {
        physicsSystem().create(key, source);
      }

      each(physicsMap(), function(sources, key) {
        each(sources, function(source) {

          if (isString(source)) {
            wireupDynamic(key, source);
          } else {
            wireupStatic(key, source);
          }

        });
      });
    };
  }
};