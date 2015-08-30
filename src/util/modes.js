'use strict';

var intersection = require('lodash').intersection;
var first = require('lodash').first;
var filter = require('lodash').filter;

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

function filterPluginsByMode (plugins, mode) {
  return filter(plugins(), function(ackMap) {
    return isApplicable(mode, ackMap);
  });
}

module.exports = {
  filterPluginsByMode: filterPluginsByMode
};