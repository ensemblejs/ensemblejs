'use strict';

import {each, reject, isString, isArray, set, has, isFunction} from 'lodash';
const forEachMode = require('../../util/modes').forEachMode;
const replaceIfPresent = require('../../util/replace-if-present');
const sequence = require('distributedlife-sequence');
const { read } = require('../../util/dot-string-support');
import Immutable from 'immutable';

const isListLike = (thing) => isArray(thing) || Immutable.List.isList(thing);

module.exports = {
  type: 'PhysicsSystemBridge',
  deps: ['DefinePlugin', 'PhysicsMap', 'StateTracker', 'PhysicsSystem', 'StateAccess'],
  func: function PhysicsSystemBridge (define, allMaps, tracker, physicsSystem, stateAccess) {

    function wireupDynamic (saveId, physicsKey, sourceKey, lens, sourceState, adapter) {
      if (isListLike(sourceState)) {
        tracker().for(saveId).onElementAdded(lens, physicsSystem().added(saveId, physicsKey, sourceKey, adapter));
        tracker().for(saveId).onElementChanged(lens, physicsSystem().changed(saveId, physicsKey, sourceKey, adapter));
        tracker().for(saveId).onElementRemoved(lens, physicsSystem().removed(saveId, physicsKey, sourceKey));
      } else {
        physicsSystem().register(saveId, physicsKey, sourceKey, adapter ? adapter(sourceState) : sourceState);

        tracker().for(saveId).onChangeOf(lens, physicsSystem().updated(saveId, sourceKey, adapter));
      }
    }

    function wireupStatic (saveId, physicsKey, source) {
      physicsSystem().register(saveId, physicsKey, `static${sequence.next('static-physics')}`, source);
    }

    function OnStateTrackerReady () {
      return function wireupPhysicsMap (save) {

        function loadPhysicsMap (physicsMap) {
          each(physicsMap, function(sources, physicsKey) {
            const stringDynamic = sources.filter(isString).concat(sources.filter(isFunction));
            stringDynamic.forEach(function(sourceKey) {
              const sourceState = stateAccess().for(save.id).get(sourceKey);
              const key = isFunction(sourceKey) ? `${physicsKey}-${sequence.next('source-key')}` : sourceKey;
              const lens = sourceKey

              wireupDynamic(save.id, physicsKey, key, lens, sourceState);
            });


            let configDyanmic = reject(sources, isString);
            configDyanmic = reject(configDyanmic, isFunction);
            configDyanmic = configDyanmic.filter((s) => has(s, 'sourceKey'));
            configDyanmic.forEach(function(config) {
              const sourceKey = config.sourceKey;
              const adapter = config.via;
              const sourceState = stateAccess().for(save.id).get(config.sourceKey);

              wireupDynamic(save.id, physicsKey, sourceKey, sourceKey, sourceState, adapter);
            });


            let statics = reject(sources, isString);
            statics = reject(statics, isFunction);
            statics = reject(statics, (s) => has(s, 'sourceKey'));
            statics.forEach(function(source) {
              const adapter = source.via;
              wireupStatic(save.id, physicsKey, adapter ? adapter(source) : source);
            });
          });
        }

        forEachMode(allMaps(), save.mode, loadPhysicsMap);
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
        changes.forEach(function (stateKey) {
          const saveState = read(state, stateKey);
          const physicsState = physicsSystem().get(stateKey);

          set(newState, stateKey, replaceIfPresent(saveState, physicsState));
        });

        return newState;
      };
    }

    define()('OnStateTrackerReady', OnStateTrackerReady);
    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};