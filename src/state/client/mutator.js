'use strict';

import {isObject, isEqual, isString, filter, set, reject, map, includes, replace, isEmpty, isFunction} from 'lodash';
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
      let prop = isFunction(key) ? key(node) : read(node, key);

      if (prop === undefined) {
        logger().error({ key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
      }

      return prop;
    }

    function provideReadAccessToState (node) {
      return function get (key) {
        return readAndWarnAboutMissingState(node, key);
      };
    }

    function genKey (playerId, namespace, key) {
      const suffix = key === undefined ? namespace : `${namespace}.${key}`;

      return `players:${playerId}.${suffix}`;
    }

    let stateAccess = {
      for: function forSave () {
        return {
          get: function get (key) {
            return provideReadAccessToState(root)(key);
          },
          for: function forNamespace (namespace) {
            return {
              get: function get (key) {
                return provideReadAccessToState(root.get(namespace))(key);
              }
            };
          },
          player: function forPlayer (playerId) {
            return {
              for: function forNamespace (namespace) {
                return {
                  get: function get (key) {
                    return provideReadAccessToState(root)(genKey(playerId, namespace, key));
                  }
                };
              },
              get: function get (key) {
                return provideReadAccessToState(root)(genKey(playerId, key));
              }
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
      return function mergeResultsFromLastFrame () {};
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
      // console.log('applyOnArrayElement', saveId, dotString, value);

      const pathToArray = dotString.split(':')[0];
      const id = parseInt(dotString.split(':')[1], 10);
      const restOfPath = replace(dotString.split(':')[1], /^[0-9]+\.?/, '');

      let entries = stateAccess.for(saveId).get(pathToArray);

      // console.log('entries', entries);

      let mod = entries.map(entry => {
        if (entry.get('id') !== id) {
          return entry;
        }

        // console.log('entry', entry);

        let nv = isFunction(value)
          ? value(isEmpty(restOfPath) ? entry.toJS() : read(entry, restOfPath))
          : value;

        // console.log(restOfPath, entry, nv)

        return isEmpty(restOfPath)
          ? entry.mergeDeep(nv)
          : entry.setIn(restOfPath.split('.'), nv);
      });

      // console.log('post-applyOnArrayElement', pathToArray, mod);

      // console.log('>>>>', mod);
      // console.log('<<<<', set({}, pathToArray, mod));
      // console.log('<<<<', Immutable.fromJS({}).setIn(pathToArray.split('.'), mod));
      // return set({}, pathToArray, mod);
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
      } else {
        const c = stateAccess.for(saveId).get(dotString);

        return set({}, dotString, isFunction(value) ? value(c) : value);
      }
    };

    function mutateNonArray (saveId, result) {
      // console.log('result', result);

      if (isArray(result)) {
        if (!isValidDotStringResult(result)) {
          return;
        }

        result = applyResult(saveId, result[0], result[1]);

        // console.log('after-applyResult', result);
      }

      function recurseMapsOnly (prev, next) {
        return Map.isMap(prev) ? prev.mergeWith(recurseMapsOnly, next) : next;
      }

      // console.log('root-before', root.toJSON());
      // console.log('pre-merge', result);
      root = root.mergeWith(recurseMapsOnly, result);
      // console.log('root-after', root.toJSON());
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

      if (isArrayOfArrays(result)) {
        mutateArrayOfArrays(saveId, result);
      } else {
        mutateNonArray(saveId, result);
      }
    };

    return mutate;
  }
};