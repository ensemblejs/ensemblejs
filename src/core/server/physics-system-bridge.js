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
        tracker().for(saveId).onElementAdded(sourceKey, physicsSystem().added(saveId, physicsKey, sourceKey, adapter));
        tracker().for(saveId).onElementChanged(sourceKey, physicsSystem().changed(saveId, physicsKey, sourceKey, adapter));
        tracker().for(saveId).onElementRemoved(sourceKey, physicsSystem().removed(saveId, physicsKey, sourceKey));
      } else {
        physicsSystem().register(saveId, physicsKey, sourceKey, adapter ? adapter(sourceState) : sourceState);

        // console.log(saveId, sourceKey);
        tracker().for(saveId).onChangeOf(sourceKey, physicsSystem().updated(saveId, sourceKey, adapter));
      }
    }

    function wireupStatic (saveId, physicsKey, source) {
      physicsSystem().register(saveId, physicsKey, 'static' + sequence.next('static-physics'), source);
    }

    function OnStateTrackerReady () {
      return function wireupPhysicsMap (save) {

        function loadPhysicsMap (physicsMap) {
          each(physicsMap, function(sources, physicsKey) {
            let stringDynamic = filter(sources, isString).concat(filter(sources, isFunction));
            each(stringDynamic, function(sourceKey) {
              let sourceState = stateAccess().for(save.id).unwrap(sourceKey);

              wireupDynamic(save.id, physicsKey, sourceKey, sourceState);
            });


            let configDyanmic = reject(sources, isString);
            configDyanmic = reject(configDyanmic, isFunction);
            configDyanmic = filter(configDyanmic, s => has(s, 'sourceKey'));
            each(configDyanmic, function(config) {
              let sourceKey = config.sourceKey;
              let adapter = config.via;
              let sourceState = stateAccess().for(save.id).unwrap(config.sourceKey);

              wireupDynamic(save.id, physicsKey, sourceKey, sourceState, adapter);
            });


            let statics = reject(sources, isString);
            statics = reject(statics, isFunction);
            statics = reject(statics, s => has(s, 'sourceKey'));
            each(statics, function(source) {
              let adapter = source.via;
              wireupStatic(save.id, physicsKey, adapter ? adapter(source) : source);
            });
          });
        }

        forEachMode(allMaps(), save.mode, loadPhysicsMap);
      };
    }

    function OnPhysicsFrame () {
      return function tickPhysicsSimulation (Δ, state) {
        var changes = physicsSystem().tick(Δ);

        if (!changes) {
          return undefined;
        }
        if (changes.length === 0) {
          return undefined;
        }

        var newState = {};
        each(changes, function (stateKey) {
          var saveState = read(state, stateKey);
          var physicsState = physicsSystem().get(stateKey);

          set(newState, stateKey, replaceIfPresent(saveState, physicsState));
        });

        return newState;
      };
    }

    define()('OnStateTrackerReady', OnStateTrackerReady);
    define()('OnPhysicsFrame', OnPhysicsFrame);
  }
};