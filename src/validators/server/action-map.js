'use strict';

var select = require('lodash').select;
var map = require('lodash').map;
var last = require('lodash').last;
var flatten = require('lodash').flatten;
var each = require('lodash').each;
var isEqual = require('lodash').isEqual;

module.exports = {
  type: 'Validator',
  deps: ['ActionMap', 'Logger'],
  func: function (actionMaps, logger) {
    return function () {
      var withoutModes = map(actionMaps(), function(actionMap) {
        return last(actionMap).tab;
      });
      var tabs = flatten(select(withoutModes, function (mode) {
        return mode;
      }));

      var invalid = select(tabs, function (tab) {
        return isEqual(tab.modifiers, ['ctrl']) || isEqual(tab.modifiers, ['ctrl', 'shift']);
      });

      each(invalid, function(invalidActionMap) {
        logger().error('ActionMap defined with ' + invalidActionMap.modifiers.join('+') + '+tab');
      });
    };
  }
};