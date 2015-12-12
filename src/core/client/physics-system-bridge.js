'use strict';

var each = require('lodash').each;
var select = require('lodash').select;
var reject = require('lodash').reject;
var isString = require('lodash').isString;
var forEachMode = require('../../util/modes').forEachMode;

module.exports = {
  type: 'PhysicsSystemBridge',
  deps: ['DefinePlugin', 'PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function PhysicsSystemBridge (define, allMaps, tracker, physicsSystem, state) {

    function wireupDynamic (gameId, key, source) {
      physicsSystem().create(gameId, key, state().for(gameId).unwrap(source));
      tracker().for(gameId).onChangeOf(source, physicsSystem().updated(gameId, key));
    }

    function wireupStatic (gameId, key, source) {
      physicsSystem().create(gameId, key, source);
    }

    function OnClientReady (mode) {

      return function wireupPhysicsMap () {
        function loadPhysicsMap (map) {
          each(map, function(sources, key) {
            each(select(sources, isString), function(source) {
              wireupDynamic('client', key, source);
            });
            each(reject(sources, isString), function(source) {
              wireupStatic('client', key, source);
            });
          });
        }

        forEachMode(allMaps(), mode(), loadPhysicsMap);
      };
    }

    function OnPhysicsFrame () {
      return function tickPhysicsSimulation (state, delta) {
        physicsSystem().tick(delta);
      };
    }

    define()('OnClientReady', ['GameMode'], OnClientReady);
    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};