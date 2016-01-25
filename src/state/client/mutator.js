'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var isString = require('lodash').isString;
var merge = require('lodash').merge;
var select = require('lodash').select;
var get = require('lodash').get;
var set = require('lodash').set;

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin', 'Logger', 'Profiler'],
  func: function Client (define, logger, profiler) {
    var root = {};
    var thisFrame = {};

    function accessState(node, key) {
      var prop = get(node, key);
      if (prop === undefined) {
        logger().warn({ key: key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
      }

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

    define()('StateAccess', function StateAccess () {
      return {
        for: function forSave () {
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

    define()('RawStateAccess', function RawStateAccess () {
      return {
        get: function get () { return root; },
        resetTo: function resetTo (newState) { root = newState; }
      };
    });

    // define()('ThisFrame', function ThisFrame () {
    //   return thisFrame;
    // });

    var profilers = {};
    profilers.isValidDotStringResult = profiler().timer('ensemblejs', 'StateMutator', 'Client.isValidDotStringResult', 1);
    profilers.applyPartialMerge = profiler().timer('ensemblejs', 'StateMutator', 'Client.applyPartialMerge', 1);
    profilers.applyMajorMerge = profiler().timer('ensemblejs', 'StateMutator', 'Client.applyMajorMerge', 1);
    profilers.isArrayOfArrays = profiler().timer('ensemblejs', 'StateMutator', 'Client.isArrayOfArrays', 1);
    profilers.ignoreResult = profiler().timer('ensemblejs', 'StateMutator', 'Client.ignoreResult', 1);
    profilers.set = profiler().timer('ensemblejs', 'StateMutator', 'Client.set', 1);

    define()('AfterPhysicsFrame', function RawStateAccess () {
      return function mergeResultsFromLastFrame () {
        profilers.applyMajorMerge.fromHere();

        root = merge(root, thisFrame, function mergeArrays (a, b) {
          return isArray(a) ? b : undefined;
        });
        thisFrame = {};

        profilers.applyMajorMerge.toHere();
      };
    });

    function isValidDotStringResult(result) {
      if (result.length !== 2) {
        logger().error(result, 'Dot.String support for state mutation expects an array of length 2.');
        return false;
      }
      if (result[1] === null) {
        return false;
      }
      if (isEqual(result[1], {})) {
        return false;
      }
      if (!isString(result[0])) {
        logger().error(result, 'Dot.String support for state mutation requires the first entry be a string.');
        return false;
      }

      return true;
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

    function mutateNonArray (saveId, result) {
      if (isArray(result)) {
        profilers.isValidDotStringResult.fromHere();

        if (!isValidDotStringResult(result)) {
          profilers.isValidDotStringResult.toHere();
          return;
        }
        profilers.isValidDotStringResult.toHere();

        profilers.set.fromHere();
        result = set({}, result[0], result[1]);
        profilers.set.toHere();
      }

      profilers.applyPartialMerge.fromHere();
      thisFrame = merge(thisFrame, result, function mergeArrays (a, b) {
        return isArray(a) ? b : undefined;
      });
      profilers.applyPartialMerge.toHere();
    }

    function isArrayOfArrays (result) {
      return select(result, isArray).length === result.length;
    }

    var handleResult;
    function mutateArrayOfArrays (saveId, result) {
      for(let i = 0; i < result.length; i += 1) {
        handleResult(saveId, result[i]);
      }
    }

    handleResult = function handleResult (saveId, result) {
      profilers.ignoreResult.fromHere();
      if (ignoreResult(result)) {
        profilers.ignoreResult.toHere();
        return false;
      }
      profilers.ignoreResult.toHere();

      profilers.isArrayOfArrays.fromHere();
      if (isArrayOfArrays(result)) {
        profilers.isArrayOfArrays.toHere();

        mutateArrayOfArrays(saveId, result);
      } else {
        profilers.isArrayOfArrays.toHere();

        mutateNonArray(saveId, result);
      }
    };

    return handleResult;
  }
};