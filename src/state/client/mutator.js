'use strict';

import {isEqual, isString, filter, set, includes, replace, isEmpty, isFunction, merge} from 'lodash';
import define from '../../plugins/plug-n-play';
import {read} from '../../util/dot-string-support';
import {isArray} from '../../util/is';
const Immutable = require('immutable');
const { Map } = require('immutable');

function recurseMapsOnly (prev, next) {
  return Map.isMap(prev) ? prev.mergeWith(recurseMapsOnly, next) : next;
}

function isArrayOfArrays (result) {
  return filter(result, isArray).length === result.length;
}

const cache = {};
function genKey (playerId, namespace, key) {
  if (cache[playerId] && cache[playerId][namespace] && cache[playerId][namespace][key]) {
    return cache[playerId][namespace][key];
  }

  const suffix = key === undefined ? namespace : `${namespace}.${key}`;

  cache[playerId] = cache[playerId] || {};
  cache[playerId][namespace] = cache[playerId][namespace] || {};
  cache[playerId][namespace][key] = `players:${playerId}.${suffix}`;

  return cache[playerId][namespace][key];
}

module.exports = {
  type: 'StateMutator',
  deps: ['Logger'],
  func: function Client (logger) {
    let root = Immutable.fromJS({});
    let pendingMerge = {};

    function readAndWarnAboutMissingState (node, key) {
      let val = isFunction(key) ? key(node.toJS()) : read(node, key);
      if (val === undefined) {
        logger().error({ key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
      }

      return val;
    }

    function wrapWithReadOnly (node) {
      return function get (key) {
        const val = readAndWarnAboutMissingState(node, key);
        return Map.isMap(val) ? wrapWithReadOnly(val) : val;
      };
    }

    function accessAndCloneState (node, key) {
      const val = readAndWarnAboutMissingState(node, key);
      return (val.toJS !== undefined) ? val.toJS() : val;
    }

    const stateAccess = {
      for: function forSave () {
        return {
          all: () => root.toJS(),
          get: key => wrapWithReadOnly(root)(key),
          unwrap: key => accessAndCloneState(root, key),
          for: function forNamespace (namespace) {
            return {
              get: key => wrapWithReadOnly(root.get(namespace))(key),
              unwrap: key => accessAndCloneState(root.get(namespace), key)
            };
          },
          player: function forPlayer (playerId) {
            return {
              for: function forNamespace (namespace) {
                return {
                  get: key => wrapWithReadOnly(root)(genKey(playerId, namespace, key)),
                  unwrap: key => accessAndCloneState(root, genKey(playerId, namespace, key))
                };
              },
              get: key => wrapWithReadOnly(root)(genKey(playerId, key)),
              unwrap: key => accessAndCloneState(root, genKey(playerId, key))
            };
          }
        };
      }
    };

    define('StateAccess', () => stateAccess);

    function applyPendingMerges () {
      root = root.mergeWith(recurseMapsOnly, pendingMerge);
      pendingMerge = {};
    }

    define('AfterPhysicsFrame', () => applyPendingMerges);
    define('RawStateAccess', () => ({
      get: () => root,
      resetTo: newState => (root = newState)
    }));

    function isValidDotStringResult(result) {
      if (result.length !== 2) {
        logger().error(result, 'Dot.String support for state mutation expects an array of length 2.');
        return false;
      }
      if (result[1] === undefined) {
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

    let applyResult;
    function applyPushAction (saveId, dotString, entries, value) {
      return applyResult(saveId, dotString, entries.push(value));
    }

    function applyPopAction (saveId, dotString, entries, value) {
      return applyResult(saveId, dotString, entries.filterNot(x => x.get('id') === value.id));
    }

    function applyReplaceAction (saveId, dotString, entries, value) {
      const mod = entries.map(x => x.get('id') === value.id ? value : x);
      // const mod = entries.filterNot(x => x.get('id') === value.id).push(value);

      return applyResult(saveId, dotString, mod);
    }

    function applyOnArrayElement (saveId, dotString, value) {
      const pathToArray = dotString.split(':')[0];
      const id = parseInt(dotString.split(':')[1], 10);
      const restOfPath = replace(dotString.split(':')[1], /^[0-9]+\.?/, '');

      let entries = stateAccess.for(saveId).get(pathToArray);

      let mod = entries.map(entry => {
        if (entry.get('id') !== id) {
          return entry;
        }

        let nv = isFunction(value)
          ? value(isEmpty(restOfPath) ? entry.toJS() : read(entry, restOfPath))
          : value;

        return isEmpty(restOfPath)
          ? entry.mergeDeep(nv)
          : entry.setIn(restOfPath.split('.'), nv);
      });

      return set({}, pathToArray, mod);
    }

    const trailingHandlers = {
      '+': applyPushAction,
      '-': applyPopAction,
      '!': applyReplaceAction
    };

    applyResult = function (saveId, dotString, value) {
      const modifierSymbol = dotString[dotString.length - 1];
      const dotStringSansModifier = dotString.split(modifierSymbol)[0];

      const handler = trailingHandlers[modifierSymbol];
      if (handler) {
        const entries = stateAccess.for(saveId).get(dotStringSansModifier);

        if (isFunction(value)) {
          logger().error({ dotString, prior: entries }, `Using a function on the ${modifierSymbol} operator is not supported. Remove the ${modifierSymbol} operator to achieve desired effect.`);

          return {};
        }

        return handler(saveId, dotStringSansModifier, entries, value);
      } else if (includes(dotString, ':')) {
        return applyOnArrayElement(saveId, dotString, value);
      }

      const c = stateAccess.for(saveId).get(dotString);
      return set({}, dotString, isFunction(value) ? value(c) : value);
    };

    function mutateNonArray (saveId, result) {
      let resultToMerge = result;

      if (isArray(result)) {
        if (!isValidDotStringResult(result)) {
          return;
        }

        resultToMerge = applyResult(saveId, result[0], result[1]);
      }

      pendingMerge = merge(pendingMerge, resultToMerge);
    }

    let mutate;
    function mutateArrayOfArrays (saveId, results) {
      results.forEach(result => mutate(saveId, result));
    }

    mutate = (saveId, result) => {
      if (ignoreResult(result)) {
        return false;
      }

      if (isArrayOfArrays(result)) {
        return mutateArrayOfArrays(saveId, result);
      }

      return mutateNonArray(saveId, result);
    };

    return mutate;
  }
};