'use strict';

var filter = require('lodash').filter;
var map = require('lodash').map;

function filter (internalState, plugin) {
  return map(filter(internalState(), plugin), function (obj) {
    return obj[plugin];
  });
}

module.exports = {
  filter: filter
};