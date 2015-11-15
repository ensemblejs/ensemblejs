'use strict';

var select = require('lodash').select;
var reject = require('lodash').reject;
var each = require('lodash').each;
var isArray = require('lodash').isArray;
var contains = require('lodash').contains;

var validTypes = [ 'once-for-all', 'every', 'once-each', 'first-only'];

module.exports = {
  type: 'OnServerStart',
  deps: ['AcknowledgementMap', 'Logger'],
  func: function AckMapValidator (ackMaps, logger) {
    return function validate () {

      function filterByMissingProperty (records, prop) {
        return select(records, function(record) { return !record[prop]; });
      }

      function filterByInvalidProperty (records, prop, valid) {
        return select(records, function(record) {
          if (!record[prop]) { return false; }

          return !contains(valid, record[prop]);
        });
      }

      each(ackMaps(), function (ackMap) {
        if (isArray(ackMap)) {
          ackMap = ackMap[1];
        }

        each(ackMap, function (records, key) {
          if (!isArray(records)) {
            ackMap[key] = [records];
            records = ackMap[key];
          }

          var invalidTarget = filterByMissingProperty(records, 'onComplete');
          each(invalidTarget, function() {
            logger().error('AcknowledgementMap "' + key + '" missing "onComplete" property');
          });

          var missingType = filterByMissingProperty(records, 'type');
          each(missingType, function() {
            logger().error('AcknowledgementMap "' + key + '" missing "type" property');
          });

          var invalidType = filterByInvalidProperty(records, 'type', validTypes);
          each(invalidType, function() {
            logger().error('AcknowledgementMap "' + key + '" has invalid "type" property of "derp"');
          });

          var hasOnProgress = select(records, 'onProgress');
          var hasOnProgressAndInvalidType = reject(hasOnProgress, {type: 'once-for-all'});
          each(hasOnProgressAndInvalidType, function() {
            logger().error('AcknowledgementMap "' + key + '" can\'t use "onProgress" property');
          });
        });
      });

    };
  }
};