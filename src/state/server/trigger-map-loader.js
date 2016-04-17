'use strict';

import {each, isObject} from 'lodash';
var forEachMode = require('../../util/modes').forEachMode;
var _ = require('lodash');

module.exports = {
  type: 'TriggerMapLoader',
  deps: ['DefinePlugin', 'StateTracker', 'TriggerMap', 'Logger'],
  func: function TriggerMapLoader (define, tracker, allMaps, logger) {

    function comparison (save, triggerInfo, comparator) {
      if (isObject(triggerInfo[comparator])) {
        logger().warn(triggerInfo, 'Comparison of objects is not supported in trigger maps. Compare against literals.');
      }

      const when = triggerInfo.when;
      const data = triggerInfo.data;
      const f = triggerInfo.call;

      tracker().for(save.id).onChangeTo(when, function (currentValue) {
        return _[comparator](currentValue, triggerInfo[comparator]);
      }, f, data);
    }

    var directTrackerMappings = ['onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
    var supportedComparisons = ['eq', 'lt', 'lte', 'gt', 'gte'];

    define()('OnSaveReady', function OnSaveReady () {
      return function loadTriggerMaps (save) {
        function loadMapsForMode (map) {
          each(map, function loadKey (value) {
            each(value, function loadTrigger (triggerInfo) {
              each(directTrackerMappings, function (f) {
                if (triggerInfo[f]) {
                  tracker().for(save.id)[f](
                    triggerInfo.when,
                    triggerInfo[f],
                    triggerInfo.data
                  );
                }
              });

              each(supportedComparisons, function (comparisonKey) {
                if (triggerInfo[comparisonKey]) {
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