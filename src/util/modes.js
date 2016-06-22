'use strict';

import {last, map} from 'lodash';
import {isArray} from './is';
import Bluebird from 'bluebird';

function intersection (a, b) {
  const result = [];

  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (a[i] === b[j]) {
        result.push(a);
        break;
      }
    }
  }

  return result;
}

function isApplicable (mode, plugin) {
  return intersection(['*', mode], isArray(plugin[0]) ? plugin[0] : [plugin[0]]).length > 0;
}

function filterPluginsByMode (plugins, mode) {
  return plugins.filter(plugin => isApplicable(mode, plugin));
}

function forEachMode (plugins, mode, callback) {
  const forMode = filterPluginsByMode(plugins, mode);
  forMode.forEach(plugin => callback(last(plugin)));
}

function callEachPlugin (plugins, params = []) {
  plugins.forEach(plugin => plugin(...params));
}

function callEachPluginAndPromises (plugins, params = []) {
  return Bluebird.all(map(plugins, function each (callback) {
    return callback(...params);
  }));
}

function callEachWithMutation (plugins, mutator, saveId, params = []) {
  plugins.forEach(plugin => mutator()(saveId, plugin(...params)));
}

function callForMode (plugins, mode, params) {
  const forMode = filterPluginsByMode(plugins, mode);
  forMode.forEach(plugin => last(plugin)(...params));
}

function callForModeWithMutation (plugins, mutator, save, params) {
  const forMode = filterPluginsByMode(plugins, save.mode);
  forMode.forEach(plugin => mutator()(save.id, last(plugin)(...params)));
}

function callForModeWithMutationWithPromises (plugins, mutator, save, params = []) {
  const forMode = filterPluginsByMode(plugins, save.mode);
  return Bluebird.all(map(forMode, function callEachAndMutate (plugin) {
    return mutator()(save.id, last(plugin)(...params));
  }));
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
  callForModeWithMutationWithPromises: callForModeWithMutationWithPromises,
  filterPluginsByMode: filterPluginsByMode,
  isApplicable: isApplicable,
  forEachMode: forEachMode,
  stripMode: stripMode
};