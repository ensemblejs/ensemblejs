'use strict';

import {each, isObject} from 'lodash';
var forEachMode = require('../../util/modes').forEachMode;
var _ = require('lodash');

module.exports = {
  type: 'TriggerMapLoader',
  deps: ['DefinePlugin', 'StateTracker', 'TriggerMap', 'Logger'],
  func: function TriggerMapLoader (define, tracker, allMaps, logger) {

    function comparison (triggerInfo, comparator) {
      if (isObject(triggerInfo[comparator])) {
        logger().warn(triggerInfo, 'Comparison of objects is not supported in trigger maps. Compare against literals.');
      }

      tracker().onChangeTo(triggerInfo.when, function (currentValue) {
        return _[comparator](currentValue, triggerInfo[comparator]);
      }, triggerInfo.call, triggerInfo.data);
    }

    var directTrackerMappings = ['onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
    var supportedComparisons = ['eq', 'lt', 'lte', 'gt', 'gte'];

    define()('OnClientReady', ['SaveMode'], function OnClientReady (mode) {
      return function loadTriggerMaps () {

        function loadMapsForMode (map) {
          each(map, function loadKey (value) {
            each(value, function loadTrigger (triggerInfo) {
              each(directTrackerMappings, function (f) {
                if (triggerInfo[f]) {
                  tracker()[f](triggerInfo.when, triggerInfo[f], triggerInfo.data);
                }
              });

              each(supportedComparisons, function (comparisonKey) {
                if (triggerInfo[comparisonKey]) {
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