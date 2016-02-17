'use strict';

import {intersection, first, isArray, last, filter, each, map} from 'lodash';
import Bluebird from 'bluebird';

function isApplicable (mode, plugin) {
  var pluginMode = first(plugin);
  if (isArray(pluginMode)) {
    return intersection(['*', mode], pluginMode).length > 0;
  } else {
    return intersection(['*', mode], [pluginMode]).length > 0;
  }
}

function filterPluginsByMode (plugins, mode) {
  return filter(plugins, function(plugin) {
    return isApplicable(mode, plugin);
  });
}

function forEachMode (plugins, mode, callback) {
  var forMode = filterPluginsByMode(plugins, mode);

  for (let i = 0; i < forMode.length; i += 1) {
    callback(last(forMode[i]));
  }
}

function callEachPlugin (plugins, params = []) {
  each(plugins, callback => callback(...params));
}

function callEachPluginAndPromises (plugins, params = []) {
  return Bluebird.all(map(plugins, function each (callback) {
    return callback(...params);
  }));
}

function callEachWithMutation (plugins, mutator, saveId, params = []) {
  each(plugins, function eachWithMutation (callback) {
    mutator()(saveId, callback(...params));
  });
}

function callForMode (plugins, mode, params) {
  var forMode = filterPluginsByMode(plugins, mode);
  each(forMode, function callEachAndMutate (plugin) {
    last(plugin)(...params);
  });
}

function callForModeWithMutation (plugins, mutator, save, params) {
  var forMode = filterPluginsByMode(plugins, save.mode);
  each(forMode, function callEachAndMutate (plugin) {
    mutator()(save.id, last(plugin)(...params));
  });
}

function stripMode(pluginAndMode) {
  return last(pluginAndMode);
}

module.exports = {
  callEachPlugin: callEachPlugin,
  callEachPluginAndPromises: callEachPluginAndPromises,
  callEachWithMutation: callEachWithMutation,
  callForMode: callForMode,
  callForModeWithMutation: callForModeWithMutation,
  filterPluginsByMode: filterPluginsByMode,
  isApplicable: isApplicable,
  forEachMode: forEachMode,
  stripMode: stripMode
};