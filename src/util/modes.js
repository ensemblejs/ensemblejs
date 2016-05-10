'use strict';

import {last, map} from 'lodash';
import {filter} from './array';
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
  return filter(plugins, function predicate (plugin) {
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
  for (let i = 0; i < plugins.length; i += 1) {
    plugins[i](...params);
  }
}

function callEachPluginAndPromises (plugins, params = []) {
  return Bluebird.all(map(plugins, function each (callback) {
    return callback(...params);
  }));
}

function callEachWithMutation (plugins, mutator, saveId, params = []) {
  for (let i = 0; i < plugins.length; i += 1) {
    mutator()(saveId, plugins[i](...params));
  }
}

function callForMode (plugins, mode, params) {
  var forMode = filterPluginsByMode(plugins, mode);
  for (let i = 0; i < forMode.length; i += 1) {
    last(forMode[i])(...params);
  }
}

function callForModeWithMutation (plugins, mutator, save, params) {
  var forMode = filterPluginsByMode(plugins, save.mode);
  for (let i = 0; i < forMode.length; i += 1) {
    mutator()(save.id, last(forMode[i])(...params));
  }
}

function callForModeWithMutationWithPromises (plugins, mutator, save, params = []) {
  var forMode = filterPluginsByMode(plugins, save.mode);
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