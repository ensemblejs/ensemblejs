'use strict';

var isEqual = require('lodash').isEqual;

module.exports = {
  type: 'StateTrackerHelpers',
  func: function StateTrackerHelpers () {
    return {
      equals: function equalsGenerator (expectedValue) {
        return function equals (currentValue) {
          return isEqual(currentValue, expectedValue);
        };
      }
    };
  }
};