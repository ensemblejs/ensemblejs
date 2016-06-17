'use strict';

import {isEqual, isString, filter, set, includes, replace, isEmpty, isFunction} from 'lodash';
import define from '../../plugins/plug-n-play';
import {read} from '../../util/dot-string-support';
import {isArray} from '../../util/is';
// const { logger } = require('../../logging/client/logger');
const Immutable = require('immutable');
const { List, Map } = require('immutable');

module.exports = {
  type: 'StateMutator',
  deps: ['Logger'],
  func: function Client (logger) {
    let root = Immutable.fromJS({});

    function readAndWarnAboutMissingState (node, key) {
      let prop = isFunction(key) ? key(node.toJS()) : read(node, key);

      if (prop === undefined) {
        logger().error({ key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
      }

      return prop;
    }

    function wrapWithReadOnly (node) {
      return function get (key) {
        const prop = readAndWarnAboutMissingState(node, key);
        return Map.isMap(prop) ? wrapWithReadOnly(prop) : prop;
      };
    }

    function accessAndCloneState (node, key) {
      const prop = readAndWarnAboutMissingState(node, key);
      return Map.isMap(prop) || List.isList(prop) ? prop.toJS() : prop;
    }

    function genKey (playerId, namespace, key) {
      const suffix = key === undefined ? namespace : `${namespace}.${key}`;

      return `players:${playerId}.${suffix}`;
    }

    const stateAccess = {
      for: function forSave () {
        return {
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

    define('StateAccess', function StateAccess () {
      return stateAccess;
    });

    define('RawStateAccess', function RawStateAccess () {
      return {
        get: () => root,
        resetTo: function resetTo (newState) {
          root = Immutable.fromJS(newState);
        }
      };
    });

    define('AfterPhysicsFrame', function RawStateAccess () {
      return function mergeResultsFromLastFrame () {
        //remove me
      };
    });

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
      const mod = entries.map(entry => entry.get('id') === value.id ? value : entry);

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

      return Immutable.fromJS({}).setIn(pathToArray.split('.'), mod);
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
          logger().error({ dotString, prior: entries }, `Using a function on the ${modifierSymbol} operator is not supported. Remove the ${modifierSymbol} operator to acheive desired effect.`);

          return Immutable.fromJS({});
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

      function recurseMapsOnly (prev, next) {
        return Map.isMap(prev) ? prev.mergeWith(recurseMapsOnly, next) : next;
      }

      root = root.mergeWith(recurseMapsOnly, resultToMerge);
    }

    function isArrayOfArrays (result) {
      return filter(result, isArray).length === result.length;
    }

    let mutate;
    function mutateArrayOfArrays (saveId, results) {
      results.forEach(result => mutate(saveId, result));
    }

    mutate = function (saveId, result) {
      if (ignoreResult(result)) {
        return false;
      }

      const f = isArrayOfArrays(result) ? mutateArrayOfArrays : mutateNonArray;
      return f(saveId, result);
    };

    return mutate;
  }
};