'use strict';

var select = require('lodash').select;
var reject = require('lodash').reject;
var each = require('lodash').each;
var isArray = require('lodash').isArray;
var contains = require('lodash').contains;

var validTypes = [ 'once-for-all', 'every', 'once-each', 'first-only'];

function filterByMissingProperty (records, prop) {
  return select(records, function(record) { return !record[prop]; });
}

function filterByInvalidProperty (records, prop, valid) {
  return select(records, function(record) {
    if (!record[prop]) { return false; }

    return !contains(valid, record[prop]);
  });
}

function checkHasOnComplete(records, key, callback) {
  var invalidTarget = filterByMissingProperty(records, 'onComplete');
  each(invalidTarget, function() {
    callback(key);
  });
}

function checkHasType (records, key, callback) {
  var missingType = filterByMissingProperty(records, 'type');
  each(missingType, function() {
    callback(key);
  });
}

function checkHasValidType (records, key, callback) {
  var invalidType = filterByInvalidProperty(records, 'type', validTypes);
  each(invalidType, function() {
    callback(key);
  });
}

function checkOnProgressType (records, key, callback) {
  var hasOnProgress = select(records, 'onProgress');
  var hasOnProgressAndInvalidType = reject(hasOnProgress, {
    type: 'once-for-all'
  });
  each(hasOnProgressAndInvalidType, function() {
    callback(key);
  });
}

module.exports = {
  type: 'OnServerStart',
  deps: ['AcknowledgementMap', 'Logger'],
  func: function AckMapValidator (ackMaps, logger) {
    function logMissingOnComplete (key) {
      logger().error('AcknowledgementMap "' + key + '" missing "onComplete" property');
    }

    function logMissingType (key) {
      logger().error('AcknowledgementMap "' + key + '" missing "type" property');
    }

    function logInvalidType (key) {
      logger().error('AcknowledgementMap "' + key + '" has invalid "type" property of "derp"');
    }

    function logInvalidOnProgressType (key) {
      logger().error('AcknowledgementMap "' + key + '" can\'t use "onProgress" property');
    }

    return function validate () {

      each(ackMaps(), function (ackMap) {
        if (isArray(ackMap)) {
          ackMap = ackMap[1];
        }

        each(ackMap, function (records, key) {
          if (!isArray(records)) {
            ackMap[key] = [records];
            records = ackMap[key];
          }

          checkHasOnComplete(records, key, logMissingOnComplete);
          checkHasType(records, key, logMissingType);
          checkHasValidType(records, key, logInvalidType);
          checkOnProgressType(records, key, logInvalidOnProgressType);
        });
      });
    };
  }
};