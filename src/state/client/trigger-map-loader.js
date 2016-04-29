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

    define()('OnClientReady', ['SaveMode'], function OnClientReady (mode) {
      return function loadTriggerMaps () {

        function loadMapsForMode (map) {
          each(map, function loadKey (value) {
            each(value, function loadTrigger (triggerInfo) {
              each(directTrackerMappings, function (f) {

                function callbackWithMutation (...args) {
                  mutator()('client', triggerInfo[f](state().for('client'), ...args));
                }

                if (triggerInfo[f]) {
                  tracker()[f](triggerInfo.when, callbackWithMutation, triggerInfo.data);

                }
              });

              each(supportedComparisons, function (comparisonKey) {
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