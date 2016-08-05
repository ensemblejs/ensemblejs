'use strict';

import {each, isObject} from 'lodash';
var forEachMode = require('../../util/modes').forEachMode;
var _ = require('lodash');

var directTrackerMappings = ['onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
var supportedComparisons = ['eq', 'lt', 'lte', 'gt', 'gte'];

module.exports = {
  type: 'TriggerMapLoader',
  deps: ['DefinePlugin', 'StateTracker', 'TriggerMap', 'Logger', 'StateMutator', 'StateAccess'],
  func: function TriggerMapLoader (define, tracker, allMaps, logger, mutator, state) {

    function comparison (save, triggerInfo, comparator) {
      if (isObject(triggerInfo[comparator])) {
        logger().warn(triggerInfo, 'Comparison of objects is not supported in trigger maps. Compare against literals.');
        return;
      }

      const when = triggerInfo.when;
      const data = triggerInfo.data;
      const callback = triggerInfo.call;
      const expectedValue = triggerInfo[comparator];

      function isTrue (currentValue) {
        return _[comparator](currentValue, expectedValue);
      }

      function callbackWithMutation (...args) {
        mutator()(save.id, callback(state().for(save.id), ...args));
      }

      tracker()
        .for(save.id)
        .onChangeTo(when, isTrue, callbackWithMutation, data);
    }

    define()('OnStateTrackerReady', () => {
      return function loadTriggerMaps (save) {

        function loadMapsForMode (map) {
          each(map, function loadKey (value) {
            each(value, function loadTrigger (triggerInfo) {
              each(directTrackerMappings, function (f) {

                function callbackWithMutation (...args) {
                  mutator()(
                    save.id, triggerInfo[f](state().for(save.id), ...args)
                  );
                }

                if (triggerInfo[f]) {
                  tracker().for(save.id)[f](
                    triggerInfo.when,
                    callbackWithMutation,
                    triggerInfo.data
                  );

                }
              });

              each(supportedComparisons, function (comparisonKey) {
                if (triggerInfo[comparisonKey] !== undefined) {
                  comparison(save, triggerInfo, comparisonKey);
                }
              });
            });
          });
        }

        forEachMode(allMaps(), save.mode, loadMapsForMode);
      };
    });
  }
};