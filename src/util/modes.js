'use strict';

var intersection = require('lodash').intersection;
var first = require('lodash').first;

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

module.exports = {
  isApplicable: isApplicable
};