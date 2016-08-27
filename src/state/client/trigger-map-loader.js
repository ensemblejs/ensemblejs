'use strict';

import isObject from 'lodash/isObject';
import each from 'lodash/each';
const forEachMode = require('../../util/modes').forEachMode;
const _ = require('lodash');

const DirectTrackerMappings = ['onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
const SupportedComparisons = ['eq', 'lt', 'lte', 'gt', 'gte'];
import { define, logger } from '../../';

module.exports = {
  type: 'TriggerMapLoader',
  deps: ['StateTracker', 'TriggerMap', 'StateMutator', 'StateAccess'],
  func: function TriggerMapLoader (tracker, allMaps, mutator, state) {

    function comparison (triggerInfo, comparator) {
      if (isObject(triggerInfo[comparator])) {
        logger().warn(triggerInfo, 'Comparison of objects is not supported in trigger maps. Compare against literals.');
        return;
      }

      const when = triggerInfo.when;
      const callback = triggerInfo.call;
      const expectedValue = triggerInfo[comparator];
      const data = triggerInfo.data;

      function isTrue (currentValue) {
        return _[comparator](currentValue, expectedValue);
      }

      function callbackWithMutation (...args) {
        mutator()('client', callback(state().for('client'), ...args));
      }

      tracker().onChangeTo(when, isTrue, callbackWithMutation, data);
    }

    define('OnClientReady', ['SaveMode'], function OnClientReady (mode) {
      return function loadTriggerMaps () {

        function loadMapsForMode (map) {
          each(map, function loadKey (value) {
            value.forEach(function loadTrigger (triggerInfo) {
              DirectTrackerMappings.forEach(function (f) {

                function callbackWithMutation (...args) {
                  mutator()('client', triggerInfo[f](state().for('client'), ...args));
                }

                if (triggerInfo[f]) {
                  tracker()[f](triggerInfo.when, callbackWithMutation, triggerInfo.data);

                }
              });

              SupportedComparisons.forEach(function (comparisonKey) {
                if (triggerInfo[comparisonKey] !== undefined) {
                  comparison(triggerInfo, comparisonKey);
                }
              });
            });
          });
        }

        forEachMode(allMaps(), mode(), loadMapsForMode);
      };
    });
  }
};