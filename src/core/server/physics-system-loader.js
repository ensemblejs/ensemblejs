'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'OnGameReady',
  deps: ['PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function (physicsMap, tracker, physicsSystem, state) {
    return function wireupPhysicsMap (game) {
      each(physicsMap(), function(sources, key) {
        each(sources, function(source) {
          physicsSystem().create(key, state().for(game.id).get(source));
          tracker().for(game.id).onChangeOf(source, physicsSystem().updated(key));
        });
      });
    };
  }
};