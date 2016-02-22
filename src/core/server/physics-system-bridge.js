'use strict';

var each = require('lodash').each;
var filter = require('lodash').filter;
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

    function wireupDynamic (saveId, physicsKey, sourceKey) {
      physicsSystem().register(saveId, physicsKey, sourceKey, state().for(saveId).unwrap(sourceKey));
      tracker().for(saveId).onChangeOf(sourceKey, physicsSystem().updated(saveId, sourceKey));
    }

    function wireupStatic (saveId, physicsKey, source) {
      physicsSystem().register(saveId, physicsKey, 'static' + sequence.next('static-physics'), source);
    }

    function OnSaveReady () {
      return function wireupPhysicsMap (save) {

        function loadPhysicsMap (map) {
          each(map, function(sources, physicsKey) {
            each(filter(sources, isString), function(sourceKey) {
              wireupDynamic(save.id, physicsKey, sourceKey);
            });
            each(reject(sources, isString), function(sourceKey) {
              wireupStatic(save.id, physicsKey, sourceKey);
            });
          });
        }

        forEachMode(allMaps(), save.mode, loadPhysicsMap);
      };
    }

    function OnPhysicsFrame () {
      return function tickPhysicsSimulation (delta, state) {
        var changes = physicsSystem().tick(delta);

        if (!changes) {
          return;
        }
        if (changes.length === 0) {
          return;
        }

        var newState = {};
        each(changes, function (stateKey) {
          var saveState = state.unwrap(stateKey);
          var physicsState = physicsSystem().get(stateKey);

          set(newState, stateKey, replaceIfPresent(saveState, physicsState));
        });

        return newState;
      };
    }

    define()('OnSaveReady', OnSaveReady);
    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};