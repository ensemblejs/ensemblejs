'use strict';

import {isObject, isArray, isEqual, cloneDeep, isString, mergeWith as merge, filter, get, set, endsWith, reject, map, includes, first, replace} from 'lodash';
import define from '../../plugins/plug-n-play';

module.exports = {
  type: 'StateMutator',
  deps: ['Logger'],
  func: function Client (logger) {
    var root = {};
    var thisFrame = {};

    function accessState(node, key) {
      var prop;

      function getArrayById (node, key) {
        let path = key.split(':')[0];
        let suffix = key.split(':')[1];

        if (includes(suffix, '.')) {
          let id = parseInt(suffix.split('.')[0], 10);
          let subPath = replace(suffix, /^[0-9]+\./, '');

          let subNode = first(filter(get(node, path), {id: id}));

          return accessState(subNode, subPath);
        } else {
          let id = parseInt(suffix, 10);
          return first(filter(get(node, path), {id: id}));
        }
      }

      function getChildren (node, key) {
        let path = key.split('*.')[0];
        let suffix = key.split('*.')[1];

        console.log(path, suffix);

        return map(get(node, path), subNode => accessState(subNode, suffix));
      }

      if (includes(key, ':')) {
        prop = getArrayById(node, key);
      } else if (includes(key, '*')) {
        prop = getChildren(node, key);
      } else {
        prop = get(node, key);
      }

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

    var stateAccess = {
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
            var playerKey = `player${playerId}`;

            return {
              for: function forNamespace (namespace) {
                return {
                  get: function get (key) {
                    return provideReadAccessToState(root[playerKey][namespace])(key);
                  },
                  unwrap: function (key) {
                    return accessAndCloneState(root[playerKey][namespace], key);
                  },
                };
              },
              get: function get (key) {
                return provideReadAccessToState(root[playerKey])(key);
              },
              unwrap: function (key) {
                return accessAndCloneState(root[playerKey], key);
              },
            };
          }
        };
      }
    };

    define('StateAccess', function StateAccess () {
      return stateAccess;
    });

    define('RawStateAccess', function RawStateAccess () {
      return {
        get: function get () { return root; },
        resetTo: function resetTo (newState) { root = newState; }
      };
    });

    define('AfterPhysicsFrame', function RawStateAccess () {
      return function mergeResultsFromLastFrame () {
        root = merge(root, thisFrame, function mergeArrays (a, b) {
          return isArray(a) ? b : undefined;
        });
        thisFrame = {};
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

    function applyPlusResult (saveId, dotString, value) {
      let entries = stateAccess.for(saveId).unwrap(dotString);

      return set({}, dotString, entries.concat([value]));
    }

    function applyMinusResult (saveId, dotString, value) {
      let entries = stateAccess.for(saveId).unwrap(dotString);

      return set({}, dotString, reject(entries, value));
    }

    function applyModifiyResult (saveId, dotString, value) {
      let entries = stateAccess.for(saveId).unwrap(dotString);
      let mod = map(entries, entry => entry.id === value.id ? value : entry);

      return set({}, dotString, mod);
    }

    function applyResult (saveId, dotString, value) {
      if (endsWith(dotString, '+')) {
        return applyPlusResult(saveId, dotString.split('+')[0], value);
      } else if (endsWith(dotString, '-')) {
        return applyMinusResult(saveId, dotString.split('-')[0], value);
      } else if (endsWith(dotString, '!')) {
        return applyModifiyResult(saveId, dotString.split('!')[0], value);
      }

      return set({}, dotString, value);
    }

    function mutateNonArray (saveId, result) {
      if (isArray(result)) {

        if (!isValidDotStringResult(result)) {
          return;
        }

        result = applyResult(saveId, result[0], result[1]);
      }

      thisFrame = merge(thisFrame, result, function mergeArrays (a, b) {
        return isArray(a) ? b : undefined;
      });
    }

    function isArrayOfArrays (result) {
      return filter(result, isArray).length === result.length;
    }

    var handleResult;
    function mutateArrayOfArrays (saveId, result) {
      for(let i = 0; i < result.length; i += 1) {
        handleResult(saveId, result[i]);
      }
    }

    handleResult = function handleResult (saveId, result) {
      if (ignoreResult(result)) {
        return false;
      }

      if (isArrayOfArrays(result)) {

        mutateArrayOfArrays(saveId, result);
      } else {

        mutateNonArray(saveId, result);
      }
    };

    return handleResult;
  }
};