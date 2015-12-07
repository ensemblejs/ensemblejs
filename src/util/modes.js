'use strict';

var intersection = require('lodash').intersection;
var first = require('lodash').first;
var isArray = require('lodash').isArray;
var last = require('lodash').last;
var select = require('lodash').select;
var each = require('lodash').each;

function isApplicable (mode, plugin) {
  if (isArray(first(plugin))) {
    return intersection(['*', mode], first(plugin)).length > 0;
  } else {
    return intersection(['*', mode], [first(plugin)]).length > 0;
  }
}

function filterPluginsByMode (plugins, mode) {
  return select(plugins, function(plugin) {
    return isApplicable(mode, plugin);
  });
}

function forEachMode (plugins, mode, callback) {
  var forMode = filterPluginsByMode(plugins, mode);
  each(forMode, function callEachAndMutate (plugin) {
    callback(last(plugin));
  });
}

function callEachPlugin (plugins, params) {
  params = params || [];

  each(plugins, function each (callback) {
    callback.apply(undefined, params);
  });
}

function callEachWithMutation (plugins, mutator, gameId, params) {
  params = params || [];

  each(plugins, function eachWithMutation (callback) {
    mutator()(gameId, callback.apply(undefined, params));
  });
}

function callForMode (plugins, mode, params) {
  var forMode = filterPluginsByMode(plugins, mode);
  each(forMode, function callEachAndMutate (plugin) {
    last(plugin).apply(undefined, params);
  });
}

function callForModeWithMutation (plugins, mutator, game, params) {
  var forMode = filterPluginsByMode(plugins, game.mode);
  each(forMode, function callEachAndMutate (plugin) {
    mutator()(game.id, last(plugin).apply(undefined, params));
  });
}

module.exports = {
  callEachPlugin: callEachPlugin,
  callEachWithMutation: callEachWithMutation,
  callForMode: callForMode,
  callForModeWithMutation: callForModeWithMutation,
  filterPluginsByMode: filterPluginsByMode,
  isApplicable: isApplicable,
  forEachMode: forEachMode
};