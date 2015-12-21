'use strict';

var each = require('lodash').each;
var forEachMode = require('../../util/modes').forEachMode;
var _ = require('lodash');

module.exports = {
  type: 'TriggerMapLoader',
  deps: ['DefinePlugin', 'StateTracker', 'TriggerMap'],
  func: function TriggerMapLoader (define, tracker, allMaps) {

    function comparison (game, key, triggerInfo, comparator) {
      tracker().for(game.id).onChangeTo(key, function (currentValue) {
        return _[comparator](currentValue, triggerInfo[comparator]);
      }, triggerInfo.call);
    }

    var directTrackerMappings = ['onChangeOf', 'onElementAdded', 'onElementRemoved', 'onElementChanged'];
    var supportedComparisons = ['eq', 'lt', 'lte', 'gt', 'gte'];

    define()('OnGameReady', function OnGameReady () {
      return function loadTriggerMaps (game) {

        function loadMapsForMode (map) {
          console.log(map);
          each(map, function loadKey (value, key) {
            console.log(value, key);
            each(value, function loadTrigger (triggerInfo) {
              console.log(triggerInfo);
              each(directTrackerMappings, function (f) {
                if (triggerInfo[f]) {
                  tracker().for(game.id)[f](key, triggerInfo[f]);
                }
              });

              each(supportedComparisons, function (comparisonKey) {
                if (triggerInfo[comparisonKey]) {
                  comparison(game, key, triggerInfo, comparisonKey);
                }
              });
            });
          });
        }

        forEachMode(allMaps(), game.mode, loadMapsForMode);
      };
    });
  }
};