'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var isEqual = require('lodash').isEqual;
var merge = require('lodash').merge;

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin'],
  func: function StateMutator (definePlugin) {
    var root = {};

    function provideReadAccessToState (stateHash) {
      return function get (key) {
        if (isObject(stateHash[key]) && !isArray(stateHash[key])) {
          return provideReadAccessToState(stateHash[key]);
        } else {
          return stateHash[key];
        }
      };
    }

    definePlugin()('StateAccess', function StateAccess () {
      return {
        for: function forGame () {
          return {
            for: function forNamespace (namespace) {
              return {
                get: function get (key) {
                  return provideReadAccessToState(root[namespace])(key);
                }
              };
            },
            player: function forPlayer (playerId) {
              return {
                get: function get (key) {
                  return provideReadAccessToState(root.player[playerId])(key);
                }
              };
            }
          };
        }
      };
    });

    definePlugin()('RawStateAccess', function RawStateAccess () {
      return {
        get: function get () { return root; },
        resetTo: function resetTo (newState) { root = newState; }
      };
    });

    return function mutate (gameId, result) {
      if (result === undefined) {
        return;
      }
      if (result === null) {
        return;
      }
      if (isEqual(result, {})) {
        return;
      }
      root = merge(root, result, function mergeArrays (a, b) {
        return isArray(a) ? b : undefined;
      });
    };
  }
};