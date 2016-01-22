'use strict';

var select = require('lodash').select;
var each = require('lodash').each;
var isEqual = require('lodash').isEqual;
var isArray = require('lodash').isArray;
var logger = require('../../logging/server/logger').logger;

function filterByMissingProperty (records, prop) {
  return select(records, function(record) { return !record[prop]; });
}

function checkForAckOrCall (records, key, callback) {
  var invalidTarget = filterByMissingProperty(records, 'call');
  invalidTarget = filterByMissingProperty(invalidTarget, 'ack');
  each(invalidTarget, function() {
    callback(key);
  });
}

function checkForNothingAndAck (records, key, callback) {
  if (key === 'nothing' && select(records, 'ack').length > 0) {
    callback(key);
  }
}

function checkForMouseAndAck (records, key, callback) {
  if (key === 'mouse' && select(records, 'ack').length > 0) {
    callback(key);
  }
}

function checkForCtrlTab (records, key, callback) {
  if (key !== 'tab') {
    return;
  }

  each(records, function (record) {
    if (isEqual(record.modifiers, ['ctrl'])) {
      callback(key);
    }
  });
}

function checkForShiftCtrlTab (records, key, callback) {
  if (key !== 'tab') {
    return;
  }

  each(records, function (record) {
    if (isEqual(record.modifiers, ['ctrl', 'shift'])) {
      callback(key);
    }
  });
}

module.exports = {
  type: 'OnServerStart',
  deps: ['ActionMap'],
  func: function ActionMapValidator (actionMaps) {
    return function validate () {

      function logMissingBothAckAndCall (key) {
        logger.error({key: key}, 'ActionMap missing "call" or "ack" property');
      }

      function logNothingAndAck (key) {
        logger.error({key: key}, 'ActionMap cannot use the "ack" property');
      }

      function logMouseAndAck (key) {
        logger.error({key: key}, 'ActionMap cannot use the "ack" property');
      }

      function logCtrlTabNotSupported (key) {
        logger.error({key: key}, 'ActionMap "tab" has "ctrl" modifier. This is not supported');
      }

      function logShiftCtrlTabNotSupported (key) {
        logger.error({key: key}, 'ActionMap "tab" has "ctrl+shift" modifier. This is not supported');
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

          checkForAckOrCall(records, key, logMissingBothAckAndCall);
          checkForNothingAndAck(records, key, logNothingAndAck);
          checkForMouseAndAck(records, key, logMouseAndAck);
          checkForCtrlTab(records, key, logCtrlTabNotSupported);
          checkForShiftCtrlTab(records, key, logShiftCtrlTabNotSupported);
        });
      });
    };
  }
};