'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var isEqual = require('lodash').isEqual;
var merge = require('lodash').merge;

var root = {};
function provideReadAccessToState (stateHash) {
  return function(key) {
    if (isObject(stateHash[key]) && !isArray(stateHash[key])) {
      return provideReadAccessToState(stateHash[key]);
    } else {
      return stateHash[key];
    }
  };
}

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin'],
  func: function StateMutator (definePlugin) {

    definePlugin()('RawStateAccess', function RawStateAccess () {
      return {
        for: function forGame (gameId) {
          return root[gameId];
        },
        all: function all () {
          return root;
        }
      };
    });

    definePlugin()('StateAccess', function () {
      return {
        for: function forGame (gameId) {
          return {
            for: function forNamespace (namespace) {
              return {
                get: function get (key) {
                  return provideReadAccessToState(root[gameId][namespace])(key);
                }
              };
            }
          };
        }
      };
    });

    //TODO: remove
    definePlugin()('NewState', function NewState () {
      return {
        create: function create (namespace, data) {
          var state = {};
          state[namespace] = data;

          return state;
        }
      };
    });

    return function mutate (gameId, result) {
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