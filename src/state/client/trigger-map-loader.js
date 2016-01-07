'use strict';

var each = require('lodash').each;
var forEachMode = require('../../util/modes').forEachMode;
var _ = require('lodash');

module.exports = {
  type: 'TriggerMapLoader',
  deps: ['DefinePlugin', 'StateTracker', 'TriggerMap'],
  func: function TriggerMapLoader (define, tracker, allMaps) {

    function comparison (key, triggerInfo, comparator) {
      tracker().onChangeTo(key, function (currentValue) {
        return _[comparator](currentValue, triggerInfo[comparator]);
      }, triggerInfo.call, triggerInfo.data);
    }

    var directTrackerMappings = ['onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
    var supportedComparisons = ['eq', 'lt', 'lte', 'gt', 'gte'];

    define()('OnClientReady', ['SaveMode'], function OnClientReady (mode) {
      return function loadTriggerMaps () {

        function loadMapsForMode (map) {
          each(map, function loadKey (value, key) {
            each(value, function loadTrigger (triggerInfo) {
              each(directTrackerMappings, function (f) {
                if (triggerInfo[f]) {
                  tracker()[f](key, triggerInfo[f], triggerInfo.data);
                }
              });

              each(supportedComparisons, function (comparisonKey) {
                if (triggerInfo[comparisonKey]) {
                  comparison(key, triggerInfo, comparisonKey);
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