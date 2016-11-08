'use strict';

const isEqual = require('lodash/isEqual');
const isArray = require('lodash/isArray');

const Call = 'call';
const Ack = 'ack';
const Nothing = 'nothing';
const Mouse = 'mouse';
const Tab = 'tab';
const Control = 'ctrl';
const Shift = 'shift';

function checkForAckOrCall (records, key, callback) {
  records.filter((record) => !record[Call])
         .filter((record) => !record[Ack])
         .forEach(() => callback(key));
}

function checkForNothingAndAck (records, key, callback) {
  if (key === Nothing && records.filter((record) => record.ack).length > 0) {
    callback(key);
  }
}

function checkForMouseAndAck (records, key, callback) {
  if (key === Mouse && records.filter((record) => record.ack).length > 0) {
    callback(key);
  }
}

function checkForCtrlTab (records, key, callback) {
  records.filter((record) => isEqual(record.modifiers, [Control]))
         .forEach(() => callback(key));
}

function checkForShiftCtrlTab (records, key, callback) {
  records.filter((record) => isEqual(record.modifiers, [Control, Shift]))
         .forEach(() => callback(key));
}

module.exports = {
  type: 'ActionMapValidator',
  deps: ['ActionMap', 'DefinePlugin', 'Logger'],
  func: function ActionMapValidator (actionMaps, define, logger) {

    function logMissingBothAckAndCall (key) {
      logger().error({ key }, `ActionMap missing "${Call}" or "${Ack}" property`);
    }

    function logNothingAndAck (key) {
      logger().error({ key }, `ActionMap cannot use the "${Ack}" property`);
    }

    function logMouseAndAck (key) {
      logger().error({ key }, `ActionMap cannot use the "${Ack}" property`);
    }

    function logCtrlTabNotSupported (key) {
      logger().error({ key }, `ActionMap "${Tab}" has "${Control}" modifier. This is not supported`);
    }

    function logShiftCtrlTabNotSupported (key) {
      logger().error({ key }, `ActionMap "${Tab}" has "${Control}+${Shift}" modifier. This is not supported`);
    }

    function validate () {
      actionMaps().forEach((ackMapDefinition) => {
        const ackMap = isArray(ackMapDefinition) ? ackMapDefinition[1] : ackMapDefinition;

        Object.keys(ackMap).forEach((key) => {
          if (!isArray(ackMap[key])) {
            ackMap[key] = [ackMap[key]]
          }

          const records = ackMap[key];

          records.filter((record) => record[Call])
                 .filter((record) => !isArray(record[Call]))
                 .forEach((record) => (record[Call] = [record[Call]]));

          checkForAckOrCall(records, key, logMissingBothAckAndCall);
          checkForNothingAndAck(records, key, logNothingAndAck);
          checkForMouseAndAck(records, key, logMouseAndAck);

          if (key === Tab) {
            checkForCtrlTab(records, key, logCtrlTabNotSupported);
            checkForShiftCtrlTab(records, key, logShiftCtrlTabNotSupported);
          }
        });
      });
    }

    function RunValidator () {
      return function validateAll () {
        actionMaps().forEach((actionMap) => validate(actionMap));
      };
    }

    define()('OnServerStart', RunValidator);
    define()('OnClientStart', RunValidator);
  }
};