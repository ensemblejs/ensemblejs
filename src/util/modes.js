'use strict';

var intersection = require('lodash').intersection;
var first = require('lodash').first;
var last = require('lodash').last;
var filter = require('lodash').filter;
var each = require('lodash').each;

function isApplicable (mode, callback) {
  return intersection(['*', mode], first(callback)).length > 0;
}

function filterPluginsByMode (plugins, mode) {
  return filter(plugins, function(plugin) {
    return isApplicable(mode, plugin);
  });
}

function callEachPlugin (plugins, args) {
  args = args || [];

  each(plugins, function each (callback) {
    callback.apply(undefined, args);
  });
}

function callEachWithMutation (plugins, mutator, gameId, args) {
  args = args || [];

  each(plugins, function eachWithMutation (callback) {
    mutator()(gameId, callback.apply(undefined, args));
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
  isApplicable: isApplicable
};