'use strict';

var filter = require('lodash').filter;
var reject = require('lodash').reject;
var each = require('lodash').each;
var isArray = require('lodash').isArray;
var includes = require('lodash').includes;
var logger = require('../../logging/server/logger').logger;

var validTypes = [ 'once-for-all', 'every', 'once-each', 'first-only'];

function filterByMissingProperty (records, prop) {
  return filter(records, function(record) { return !record[prop]; });
}

function filterByInvalidProperty (records, prop, valid) {
  return filter(records, function(record) {
    if (!record[prop]) { return false; }

    return !includes(valid, record[prop]);
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
  each(invalidType, function(record) {
    callback(key, record.type);
  });
}

function checkOnProgressType (records, key, callback) {
  var hasOnProgress = filter(records, 'onProgress');
  var hasOnProgressAndInvalidType = reject(hasOnProgress, {
    type: 'once-for-all'
  });
  each(hasOnProgressAndInvalidType, function() {
    callback(key);
  });
}

module.exports = {
  type: 'OnServerStart',
  deps: ['AcknowledgementMap'],
  func: function AckMapValidator (ackMaps) {
    function logMissingOnComplete (key) {
      logger.error({key: key, property: 'onComplete'}, 'AcknowledgementMap missing property');
    }

    function logMissingType (key) {
      logger.error({key: key}, 'AcknowledgementMap missing "type" property');
    }

    function logInvalidType (key, property) {
      logger.error({key: key, property: property}, 'AcknowledgementMap has invalid "type" property');
    }

    function logInvalidOnProgressType (key) {
      logger.error({key: key, property: 'onProgress'}, 'AcknowledgementMap can\'t use property');
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