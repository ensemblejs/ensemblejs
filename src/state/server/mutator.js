'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var isEqual = require('lodash').isEqual;
var merge = require('lodash').merge;
var each = require('lodash').each;

var root = {};

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin', 'Logger'],
  func: function StateMutator (definePlugin, logger) {

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

    function provideReadAccessToState (stateHash) {
      return function(key) {
        var parts = key.split('.');
        var prop = stateHash;
        each(parts, function (part) {
          prop = prop[part];

          if (prop === undefined) {
            logger().warn({ key: key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
          }
        });

        if (isObject(prop) && !isArray(prop)) {
          return provideReadAccessToState(prop);
        } else {
          return prop;
        }
      };
    }

    definePlugin()('StateAccess', function () {
      return {
        for: function forGame (gameId) {
          return {
            get: function getUsingDotString (dotString) {
              return provideReadAccessToState(root[gameId])(dotString);
            },
            for: function forNamespace (namespace) {
              return {
                get: function get (key) {
                  return provideReadAccessToState(root[gameId][namespace])(key);
                }
              };
            },
            player: function forPlayer (playerId) {
              return {
                for: function forNamespace (namespace) {
                  return {
                    get: function get (key) {
                      return provideReadAccessToState(root[gameId].player[playerId][namespace])(key);
                    }
                  };
                },
                get: function get (key) {
                  return provideReadAccessToState(root[gameId].player[playerId])(key);
                }
              };
            }
          };
        }
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

      root[gameId] = root[gameId] || {};
      root[gameId] = merge(root[gameId], result, function mergeArrays (a, b) {
        return isArray(a) ? b : undefined;
      });
    };
  }
};