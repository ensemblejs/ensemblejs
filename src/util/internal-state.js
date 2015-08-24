'use strict';

var select = require('lodash').select;
var map = require('lodash').map;

function filter (internalState, plugin) {
  return map(select(internalState(), plugin), function (obj) {
    return obj[plugin];
  });
}

module.exports = {
  filter: filter
};