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
  filterPluginsByMode(plugins, mode).forEach(plugin => callback(plugin[1]));
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
  filterPluginsByMode(plugins, mode).forEach(plugin => plugin[1](...params));
}

function callForModeWithMutation (plugins, mutator, save, params) {
  // console.time('callForModeWithMutation');
  // console.time('filter');
  const forMode = filterPluginsByMode(plugins, save.mode);
  // console.timeEnd('filter');

  // console.time('process');
  const res = forMode.map((plugin) => plugin[1](...params))
  // console.timeEnd('process');

  // console.time('mutateALL');
  res.forEach((res) => mutator()(save.id, res));
  // console.timeEnd('mutateALL');
  // console.timeEnd('callForModeWithMutation');
}

function callForModeWithMutationWithPromises (plugins, mutator, save, params = []) {
  const forMode = filterPluginsByMode(plugins, save.mode);
  return Bluebird.all(map(forMode, function callEachAndMutate (plugin) {
    return mutator()(save.id, plugin[1](...params));
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