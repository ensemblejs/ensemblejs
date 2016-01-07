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

function callEachWithMutation (plugins, mutator, saveId, params) {
  params = params || [];

  each(plugins, function eachWithMutation (callback) {
    mutator()(saveId, callback.apply(undefined, params));
  });
}

function callForMode (plugins, mode, params) {
  var forMode = filterPluginsByMode(plugins, mode);
  each(forMode, function callEachAndMutate (plugin) {
    last(plugin).apply(undefined, params);
  });
}

function callForModeWithMutation (plugins, mutator, save, params) {
  var forMode = filterPluginsByMode(plugins, save.mode);
  each(forMode, function callEachAndMutate (plugin) {
    mutator()(save.id, last(plugin).apply(undefined, params));
  });
}

function stripMode(pluginAndMode) {
  return last(pluginAndMode);
}

module.exports = {
  callEachPlugin: callEachPlugin,
  callEachWithMutation: callEachWithMutation,
  callForMode: callForMode,
  callForModeWithMutation: callForModeWithMutation,
  filterPluginsByMode: filterPluginsByMode,
  isApplicable: isApplicable,
  forEachMode: forEachMode,
  stripMode: stripMode
};