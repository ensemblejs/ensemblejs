'use strict';

import {isObject, isArray, isEqual, cloneDeep, isString, mergeWith as merge, filter, get, set, reject, map, includes, first, replace, isEmpty, tail, isFunction} from 'lodash';
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
        let suffix = tail(key.split(':')).join(':');

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

    var applyResult;
    function applyPushAction (saveId, dotString, entries, value) {
      return applyResult(saveId, dotString, entries.concat([value]));
    }

    function applyPopAction (saveId, dotString, entries, value) {
      return applyResult(saveId, dotString, reject(entries, value));
    }

    function applyReplaceAction (saveId, dotString, entries, value) {
      let mod = map(entries, entry => entry.id === value.id ? value : entry);

      return applyResult(saveId, dotString, mod);
    }

    function applyOnArrayElement (saveId, dotString, value) {
      const pathToArray = dotString.split(':')[0];
      const id = parseInt(dotString.split(':')[1], 10);
      const restOfPath = replace(dotString.split(':')[1], /^[0-9]+\.?/, '');

      let entries = stateAccess.for(saveId).unwrap(pathToArray);

      let mod = map(entries, entry => {
        if (entry.id !== id) {
          return entry;
        }

        var nv = isFunction(value) ? value(
          isEmpty(restOfPath) ? entry : get(entry, restOfPath)
        ) : value;

        return isEmpty(restOfPath) ? merge(entry, nv) : set(entry, restOfPath, nv);
      });

      return set({}, pathToArray, mod);
    }

    let trailingHandlers = {
      '+': applyPushAction,
      '-': applyPopAction,
      '!': applyReplaceAction
    };

    applyResult = function applyResult (saveId, dotString, value) {
      let modifierSymbol = dotString[dotString.length - 1];
      var dotStringSansModifier = dotString.split(modifierSymbol)[0];

      var handler= trailingHandlers[modifierSymbol];
      if (handler) {
        let entries = stateAccess.for(saveId).unwrap(dotStringSansModifier);

        if (isFunction(value)) {
          logger().error({dotString: dotString, prior: entries}, `Using a function on the ${modifierSymbol} operator is not supported. Remove the ${modifierSymbol} operator to acheive desired effect.`);

          return {};
        }

        return handler(saveId, dotStringSansModifier, entries, value);
      } else if (includes(dotString, ':')) {
        return applyOnArrayElement(saveId, dotString, value);
      } else {
        var c = stateAccess.for(saveId).unwrap(dotString);

        return set({}, dotString, isFunction(value) ? value(c) : value);
      }
    };

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

    var mutate;
    function mutateArrayOfArrays (saveId, result) {
      for(let i = 0; i < result.length; i += 1) {
        mutate(saveId, result[i]);
      }
    }

    mutate = function mutate (saveId, result) {
      if (ignoreResult(result)) {
        return false;
      }

      if (isArrayOfArrays(result)) {

        mutateArrayOfArrays(saveId, result);
      } else {

        mutateNonArray(saveId, result);
      }
    };

    return mutate;
  }
};