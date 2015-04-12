'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var merge = require('lodash').merge;


var root = {};
var provideReadAccessToState = function(stateHash) {
  return function(key) {
    if (isObject(stateHash[key]) && !isArray(stateHash[key])) {
      return provideReadAccessToState(stateHash[key]);
    } else {
      return stateHash[key];
    }
  };
};

var rootNodeAccess = provideReadAccessToState(root);

var StateAccess = {
  get: function(key) {
    return rootNodeAccess(key);
  }
};

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin'],
  func: function (definePlugin) {
    definePlugin()('StateAccess', function () { return StateAccess; });
    definePlugin()('RawStateAccess', function () { return root; });

    return function(result) {
      root = merge(root, result, function (a, b) {
        return isArray(a) ? b : undefined;
      });
    };
  }
};