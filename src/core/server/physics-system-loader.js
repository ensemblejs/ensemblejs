'use strict';

var each = require('lodash').each;

module.exports = {
  type: 'OnSomethingSomething',
  deps: ['PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function (physicsMap, tracker, physicsSystem, state) {
    return function wireupPhysicsMap (gameId) {
      each(physicsMap(), function(sources, key) {
        each(sources, function(source) {
          physicsSystem().create(key, state().for(gameId).get(source));
          tracker().for(gameId).onChangeOf(source, physicsSystem().updated(key));
        });
      });
    };
  }
};