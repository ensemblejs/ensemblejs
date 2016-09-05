'use strict';

import {each, filter, reject, isString, isArray, set, has, isFunction} from 'lodash';
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
          each(map, function(sources, physicsKey) {
            const stringDynamic = filter(sources, isString).concat(filter(sources, isFunction));
            each(stringDynamic, function(sourceKey) {
              const sourceState = stateAccess().for('client').get(sourceKey);
              const key = isFunction(sourceKey) ? `${physicsKey}-${sequence.next('source-key')}` : sourceKey;
              const lens = sourceKey

              wireupDynamic('client', physicsKey, key, lens, sourceState);
            });


            let configDynamic = reject(sources, isString);
            configDynamic = reject(configDynamic, isFunction);
            configDynamic = filter(configDynamic, (s) => has(s, 'sourceKey'));
            each(configDynamic, function eachDynamicConfig (config) {
              const sourceKey = config.sourceKey;
              const adapter = config.via;
              const sourceState = stateAccess().for('client').get(config.sourceKey);
              wireupDynamic('client', physicsKey, sourceKey, sourceKey, sourceState, adapter);
            });


            let statics = reject(sources, isString);
            statics = reject(statics, isFunction);
            statics = reject(statics, (s) => has(s, 'sourceKey'));
            each(statics, function(source) {
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
        const changes = physicsSystem().tick(Δ);
        if (!changes) {
          return undefined;
        }
        if (changes.length === 0) {
          return undefined;
        }

        const newState = {};
        each(changes, (stateKey) => {
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