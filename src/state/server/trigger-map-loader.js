'use strict';

import {each, isObject} from 'lodash';
var forEachMode = require('../../util/modes').forEachMode;
var _ = require('lodash');

module.exports = {
  type: 'TriggerMapLoader',
  deps: ['DefinePlugin', 'StateTracker', 'TriggerMap', 'Logger'],
  func: function TriggerMapLoader (define, tracker, allMaps, logger) {

    function comparison (save, key, triggerInfo, comparator) {
      if (isObject(triggerInfo[comparator])) {
        logger().warn(triggerInfo, 'Comparison of objects is not supported in trigger maps. Compare against literals.');
      }

      tracker().for(save.id).onChangeTo(key, function (currentValue) {
        return _[comparator](currentValue, triggerInfo[comparator]);
      }, triggerInfo.call, triggerInfo.data);
    }

    var directTrackerMappings = ['onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
    var supportedComparisons = ['eq', 'lt', 'lte', 'gt', 'gte'];

    define()('OnSaveReady', function OnSaveReady () {
      return function loadTriggerMaps (save) {
        function loadMapsForMode (map) {
          each(map, function loadKey (value, key) {
            each(value, function loadTrigger (triggerInfo) {
              each(directTrackerMappings, function (f) {
                if (triggerInfo[f]) {
                  tracker().for(save.id)[f](key, triggerInfo[f], triggerInfo.data);
                }
              });

              each(supportedComparisons, function (comparisonKey) {
                if (triggerInfo[comparisonKey]) {
                  comparison(save, key, triggerInfo, comparisonKey);
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