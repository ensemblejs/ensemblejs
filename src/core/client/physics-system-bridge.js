'use strict';

import {each, filter, reject, isString, isArray, set, has, isFunction} from 'lodash';
var forEachMode = require('../../util/modes').forEachMode;
var replaceIfPresent = require('../../util/replace-if-present');
var sequence = require('distributedlife-sequence');
const { read } = require('../../util/dot-string-support');

module.exports = {
  type: 'PhysicsSystemBridge',
  deps: ['DefinePlugin', 'PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function PhysicsSystemBridge (define, allMaps, tracker, physicsSystem, stateAccess) {

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
            let stringDynamic = filter(sources, isString).concat(filter(sources, isFunction));
            each(stringDynamic, function(sourceKey) {
              let sourceState = stateAccess().for('client').unwrap(sourceKey);
              wireupDynamic('client', physicsKey, sourceKey, sourceState);
            });


            let configDynamic = reject(sources, isString);
            configDynamic = reject(configDynamic, isFunction);
            configDynamic = filter(configDynamic, s => has(s, 'sourceKey'));
            each(configDynamic, function eachDynamicConfig (config) {
              let sourceKey = config.sourceKey;
              let adapter = config.via;
              let sourceState = stateAccess().for('client').unwrap(config.sourceKey);
              wireupDynamic('client', physicsKey, sourceKey, sourceState, adapter);
            });


            let statics = reject(sources, isString);
            statics = reject(statics, isFunction);
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
      return function tickPhysicsSimulation (Δ, state) {
        const changes = physicsSystem().tick(Δ);
        if (!changes) {
          return undefined;
        }
        if (changes.length === 0) {
          return undefined;
        }

        let newState = {};
        changes.forEach(stateKey => {
          const saveState = read(state, stateKey);
          const physicsState = physicsSystem().get(stateKey);

          set(newState, stateKey, replaceIfPresent(saveState, physicsState));
        });

        return newState;
      };
    }

    define()('OnClientReady', ['SaveMode'], OnClientReady);
    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};