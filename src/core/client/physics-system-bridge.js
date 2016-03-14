'use strict';

import {each, filter, reject, isString, isArray, set, has} from 'lodash';
var forEachMode = require('../../util/modes').forEachMode;
var replaceIfPresent = require('../../util/replace-if-present');
var sequence = require('distributedlife-sequence');

module.exports = {
  type: 'PhysicsSystemBridge',
  deps: ['DefinePlugin', 'PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function PhysicsSystemBridge (define, allMaps, tracker, physicsSystem, state) {

    function wireupDynamic (saveId, physicsKey, sourceKey, sourceState, adapter) {
      if (isArray(sourceState)) {
        tracker().onElementAdded(sourceKey, physicsSystem().added(saveId, physicsKey, sourceKey, adapter));
        tracker().onElementChanged(sourceKey, physicsSystem().changed(saveId, physicsKey, sourceKey, adapter));
        tracker().onElementRemoved(sourceKey, physicsSystem().removed(saveId, physicsKey, sourceKey));
      } else {
        physicsSystem().register(saveId, physicsKey, sourceKey, adapter ? adapter(sourceState) : sourceState);

        tracker().onChangeOf(sourceKey, physicsSystem().updated(saveId, sourceKey, adapter));
      }
    }

    function wireupStatic (saveId, physicsKey, source) {
      physicsSystem().register(saveId, physicsKey, `static${sequence.next('static-physics')}`, source);
    }

    function OnClientReady (mode) {

      return function wireupPhysicsMap () {
        function loadPhysicsMap (map) {
          each(map, function(sources, physicsKey) {
            let stringDynamic = filter(sources, isString);
            each(stringDynamic, function(sourceKey) {
              let sourceState = state().for('client').unwrap(sourceKey);

              wireupDynamic('client', physicsKey, sourceKey, sourceState);
            });


            let configDyanamic = reject(sources, isString);
            configDyanamic = filter(configDyanamic, s => has(s, 'sourceKey'));
            each(configDyanamic, function eachDynamicConfig (config) {
              let sourceKey = config.sourceKey;
              let adapter = config.via;
              let sourceState = state().for('client').unwrap(config.sourceKey);

              wireupDynamic('client', physicsKey, sourceKey, sourceState, adapter);
            });


            let statics = reject(sources, isString);
            statics = reject(statics, s => has(s, 'sourceKey'));
            each(statics, function(source) {
              let adapter = source.via;
              wireupStatic('client', physicsKey, adapter ? adapter(source) : source);
            });
          });
        }

        forEachMode(allMaps(), mode(), loadPhysicsMap);
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

    define()('OnClientReady', ['SaveMode'], OnClientReady);
    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};