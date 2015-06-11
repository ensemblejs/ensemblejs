'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var isEqual = require('lodash').isEqual;
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

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin'],
  func: function (definePlugin) {

    definePlugin()('RawStateAccess', function () {
      return {
        for: function(gameId) {
          return root[gameId];
        },
        all: function() {
          return root;
        }
      };
    });

    definePlugin()('StateAccess', function () {
      return {
        for: function(gameId) {
          return {
            for: function(namespace) {
              return {
                get: function(key) {
                  return provideReadAccessToState(root[gameId][namespace])(key);
                }
              };
            }
          };
        }
      };
    });

    definePlugin()('NewState', function () {
      return {
        create: function(namespace, data) {
          var state = {};
          state[namespace] = data;

          return state;
        }
      };
    });

    return function(gameId, result) {
      if (result === undefined) {
        return;
      }
      if (isEqual(result, {})) {
        return;
      }

      root[gameId] = root[gameId] || {};
      root[gameId] = merge(root[gameId], result, function (a, b) {
        return isArray(a) ? b : undefined;
      });
    };
  }
};