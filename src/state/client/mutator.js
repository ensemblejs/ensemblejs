'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var isString = require('lodash').isString;
var merge = require('lodash').merge;
var each = require('lodash').each;

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin', 'Logger'],
  func: function StateMutator (definePlugin, logger) {
    var root = {};

    function accessState(node, key) {
      var parts = key.split('.');
      var prop = node;
      each(parts, function (part) {
        prop = prop[part];

        if (prop === undefined) {
          logger().warn({ key: key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
        }
      });

      return prop;
    }

    function provideReadAccessToState (node) {
      return function(key) {
        var prop = accessState(node, key);

        if (isObject(prop) && !isArray(prop)) {
          return provideReadAccessToState(prop);
        } else {
          return prop;
        }
      };
    }

    function accessAndCloneState (node, key) {
      var prop = accessState(node, key);

      if (isObject(prop)) {
        return cloneDeep(prop);
      } else {
        return prop;
      }
    }

    definePlugin()('StateAccess', function StateAccess () {
      return {
        for: function forGame () {
          return {
            get: function get (key) {
              return provideReadAccessToState(root)(key);
            },
            unwrap: function (key) {
              return accessAndCloneState(root, key);
            },
            for: function forNamespace (namespace) {
              return {
                get: function get (key) {
                  return provideReadAccessToState(root[namespace])(key);
                },
                unwrap: function (key) {
                  return accessAndCloneState(root[namespace], key);
                },
              };
            },
            player: function forPlayer (playerId) {
              return {
                for: function forNamespace (namespace) {
                  return {
                    get: function get (key) {
                      return provideReadAccessToState(root.player[playerId][namespace])(key);
                    },
                    unwrap: function (key) {
                      return accessAndCloneState(root.player[playerId][namespace], key);
                    },
                  };
                },
                get: function get (key) {
                  return provideReadAccessToState(root.player[playerId])(key);
                },
                unwrap: function (key) {
                  return accessAndCloneState(root.player[playerId], key);
                },
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

    function isValidDotStringResult(result) {
      if (result.length !== 2) {
        logger().error(result, 'Dot.String support for state mutation expects an array of length 2.');
        return false;
      }
      if (!isString(result[0])) {
        logger().error(result, 'Dot.String support for state mutation requires the first entry be a string.');
        return false;
      }
      if (result[1] === null) {
        return false;
      }
      if (isEqual(result[1], {})) {
        return false;
      }

      return true;
    }

    function isLastPart(index, dotStringParts) {
      return (index + 1 === dotStringParts.length);
    }

    function mapDotStringResultToObject (result) {
      var newResult = {};
      var dotStringParts = result[0].split('.');

      var currentNode = newResult;
      each(dotStringParts, function (part, index) {
        currentNode[part] = isLastPart(index, dotStringParts) ? result[1] : {};
        currentNode = currentNode[part];
      });

      return newResult;
    }

    function ignoreResult (result) {
      if (result === undefined) {
        return true;
      }
      if (result === null) {
        return true;
      }
      if (isEqual(result, {})) {
        return true;
      }
      if (isEqual(result, [])) {
        return true;
      }

      return false;
    }

    return function mutate (gameId, result) {
      if (ignoreResult(result)) {
        return true;
      }

      if (isArray(result)) {
        if (!isValidDotStringResult(result)) {
          return;
        }

        result = mapDotStringResultToObject(result);
      }

      root = merge(root, result, function mergeArrays (a, b) {
        return isArray(a) ? b : undefined;
      });
    };
  }
};