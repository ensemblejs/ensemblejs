'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var isEqual = require('lodash').isEqual;
var merge = require('lodash').merge;
var each = require('lodash').each;
var head = require('lodash').head;
var tail = require('lodash').tail;

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin', 'Logger'],
  func: function StateMutator (definePlugin, logger) {
    var root = {};

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

    function getUsingDotString (dotString) {
      var parts = dotString.split('.');
      var prop = provideReadAccessToState(root[head(parts)]);
      if (!prop) {
        logger().warn({ dotString: dotString }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
      }

      each(tail(parts), function (part) {
        prop = prop(part);
        if (prop === undefined) {
          logger().warn({ dotString: dotString }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
        }
      });

      return prop;
    }

    definePlugin()('StateAccess', function StateAccess () {
      return {
        for: function forGame () {
          return {
            get: function get (dotString) {
              return provideReadAccessToState(root)(dotString);
            },
            for: function forNamespace (namespace) {
              return {
                get: function get (key) {
                  return provideReadAccessToState(root[namespace])(key);
                }
              };
            },
            player: function forPlayer (playerId) {
              return {
                for: function forNamespace (namespace) {
                  return {
                    get: function get (key) {
                      return provideReadAccessToState(root.player[playerId][namespace])(key);
                    }
                  };
                },
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