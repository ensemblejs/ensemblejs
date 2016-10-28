'use strict';

import {isString, isArray, set, has, isFunction} from 'lodash';
const forEachMode = require('../../util/modes').forEachMode;
const replaceIfPresent = require('../../util/replace-if-present');
const sequence = require('distributedlife-sequence');
import read from 'ok-selector';
import Immutable from 'immutable';

const isListLike = (thing) => isArray(thing) || Immutable.List.isList(thing);

module.exports = {
  type: 'PhysicsSystemBridge',
  deps: ['DefinePlugin', 'PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function PhysicsSystemBridge (define, allMaps, tracker, physicsSystem, stateAccess) {

    function wireupDynamic (saveId, physicsKey, sourceKey, lens, sourceState, adapter) {
      if (isListLike(sourceState)) {
        tracker().onElementAdded(lens, physicsSystem().added(saveId, physicsKey, sourceKey, adapter));
        tracker().onElementChanged(lens, physicsSystem().changed(saveId, physicsKey, sourceKey, adapter));
        tracker().onElementRemoved(lens, physicsSystem().removed(saveId, physicsKey, sourceKey));
      } else {
        physicsSystem().register(saveId, physicsKey, sourceKey, adapter ? adapter(sourceState) : sourceState);

        tracker().onChangeOf(lens, physicsSystem().updated(saveId, sourceKey, adapter));
      }
    }

    function wireupStatic (saveId, physicsKey, source) {
      physicsSystem().register(saveId, physicsKey, `static${sequence.next('static-physics')}`, source);
    }

    function OnClientReady (mode) {
      return function wireupPhysicsMap () {
        function loadPhysicsMap (map) {
          Object.keys(map).forEach((physicsKey) => {
            const sources = map[physicsKey];

            const stringDynamic = sources.filter(isString).concat(sources.filter(isFunction));
            stringDynamic.forEach(function(sourceKey) {
              const sourceState = stateAccess().for('client').get(sourceKey);
              const key = isFunction(sourceKey) ? `${physicsKey}-${sequence.next('source-key')}` : sourceKey;
              const lens = sourceKey

              wireupDynamic('client', physicsKey, key, lens, sourceState);
            });


            let configDynamic = sources.filter((s) => !isString(s));
            configDynamic = configDynamic.filter((s) => !isFunction(s));
            configDynamic = configDynamic.filter((s) => has(s, 'sourceKey'));
            configDynamic.forEach(function eachDynamicConfig (config) {
              const sourceKey = config.sourceKey;
              const adapter = config.via;
              const sourceState = stateAccess().for('client').get(config.sourceKey);
              wireupDynamic('client', physicsKey, sourceKey, sourceKey, sourceState, adapter);
            });


            let statics = sources.filter((s) => !isString(s));
            statics = statics.filter((s) => !isFunction(s));
            statics = statics.filter((s) => !has(s, 'sourceKey'));
            statics.forEach(function(source) {
              const adapter = source.via;
              wireupStatic('client', physicsKey, adapter ? adapter(source) : source);
            });
          });
        }

        forEachMode(allMaps(), mode(), loadPhysicsMap);
      };
    }

    function OnPhysicsFrame () {
      return function tickPhysicsSimulation (Δ, state) {
        console.time('tickPhysicsSimulation');
        const changes = physicsSystem().tick(Δ);
        if (!changes) {
          console.timeEnd('tickPhysicsSimulation');
          return undefined;
        }
        if (changes.length === 0) {
          console.timeEnd('tickPhysicsSimulation');
          return undefined;
        }

        const newState = {};
        changes.forEach((stateKey) => {
          const saveState = read(state, stateKey);
          const physicsState = physicsSystem().get(stateKey);

          set(newState, stateKey, replaceIfPresent(saveState, physicsState));
        });

        console.timeEnd('tickPhysicsSimulation');
        return newState;
      };
    }

    define()('OnClientReady', ['SaveMode'], OnClientReady);
    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};