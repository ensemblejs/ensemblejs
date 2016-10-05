'use strict';

import isArray from 'lodash/isArray';
const logger = require('../../logging/server/logger').logger;
const validTypes = [ 'once-for-all', 'every', 'once-each', 'first-only'];

function filterByMissingProperty (records, prop) {
  return records.filter((record) => !record[prop]);
}

function filterByInvalidProperty (records, prop, valid) {
  return records.filter((record) => {
    if (!record[prop]) { return false; }

    return !valid.includes(record[prop]);
  });
}

function checkHasOnComplete(records, key, callback) {
  const invalidTarget = filterByMissingProperty(records, 'onComplete');
  invalidTarget.forEach(() => callback(key));
}

function checkHasType (records, key, callback) {
  const missingType = filterByMissingProperty(records, 'type');
  missingType.forEach(() => callback(key));
}

function checkHasValidType (records, key, callback) {
  const invalidType = filterByInvalidProperty(records, 'type', validTypes);
  invalidType.forEach((record) => callback(key, record.type));
}

function checkOnProgressType (records, key, callback) {
  const hasOnProgress = records.filter((record) => record.onProgress);
  const hasOnProgressAndInvalidType = hasOnProgress.filter((record) => record.type !== 'once-for-all');
  hasOnProgressAndInvalidType.forEach(() => callback(key));
}

module.exports = {
  type: 'OnServerStart',
  deps: ['AcknowledgementMap'],
  func: function AckMapValidator (ackMaps) {
    function logMissingOnComplete (key) {
      logger.error({key, property: 'onComplete'}, 'AcknowledgementMap missing property');
    }

    function logMissingType (key) {
      logger.error({key}, 'AcknowledgementMap missing "type" property');
    }

    function logInvalidType (key, property) {
      logger.error({key, property}, 'AcknowledgementMap has invalid "type" property');
    }

    function logInvalidOnProgressType (key) {
      logger.error({key, property: 'onProgress'}, 'AcknowledgementMap can\'t use property');
    }

    return function validate () {
      ackMaps().forEach((srcAckMap) => {
        let ackMap = srcAckMap;

        if (isArray(ackMap)) {
          ackMap = ackMap[1];
        }

        Object.keys(ackMap).forEach((key) => {
          let records = ackMap[key];
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