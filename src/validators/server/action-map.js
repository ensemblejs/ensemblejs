'use strict';

var select = require('lodash').select;
var each = require('lodash').each;
var isEqual = require('lodash').isEqual;
var isArray = require('lodash').isArray;

module.exports = {
  type: 'OnServerStart',
  deps: ['ActionMap', 'Logger'],
  func: function ActionMapValidator (actionMaps, logger) {
    return function validate () {

      function filterByMissingProperty (records, prop) {
        return select(records, function(record) { return !record[prop]; });
      }

      each(actionMaps(), function (ackMap) {
        if (isArray(ackMap)) {
          ackMap = ackMap[1];
        }

        each(ackMap, function (records, key) {
          if (!isArray(records)) {
            ackMap[key] = [records];
            records = ackMap[key];
          }

          var invalidTarget = filterByMissingProperty(records, 'target');
          each(invalidTarget, function() {
            logger().error('ActionMap "' + key + '" missing "target" property');
          });

          if (key === 'tab') {
            each(records, function (record) {
              if (isEqual(record.modifiers, ['ctrl'])) {
                logger().error('ActionMap "tab" has "ctrl" modifier. This is not supported');
              }

              if (isEqual(record.modifiers, ['ctrl', 'shift'])) {
                logger().error('ActionMap "tab" has "ctrl+shift" modifier. This is not supported');
              }
            });
          }
        });
      });
    };
  }
};