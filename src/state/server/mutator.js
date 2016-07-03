'use strict';

import {isArray, isString, isEqual, filter, set, includes, replace, isEmpty, isFunction} from 'lodash';

var logger = require('../../logging/server/logger').logger;
var saves = require('../../util/models/saves');
import {read} from '../../util/dot-string-support';
const Immutable = require('immutable');
const {Map, List} = require('immutable');
import Bluebird from 'bluebird';

const root = {};
const Dot = '.';

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin'],
  func: function StateMutator (define) {

    define()('RawStateAccess', function RawStateAccess () {
      return {
        for: saveId => root[saveId],
        all: () => root
      };
    });

    function resetSaveOnLoad (state) {
      state.ensemble.waitingForPlayers = true;
      state.ensemble.paused = true;

      return state;
    }

    define()('OnLoadSave', ['On'], function (on) {
      return function loadSaveFromDb (save) {
        function keepInMemory (state) {
          root[save.id] = Immutable.fromJS(resetSaveOnLoad(state));

          on().saveReady(save);
        }

        return saves.getById(save.id).then(keepInMemory);
      };
    });

    function readAndWarnAboutMissingState (node, key) {
      var val = isFunction(key) ? key(node.toJS()) : read(node, key);
      if (val === undefined) {
        logger.error({ key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
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
      return Map.isMap(val) || List.isList(val) ? val.toJS() : val;
    }

    function genKey (playerId, namespace, key) {
      const suffix = key === undefined ? namespace : `${namespace}.${key}`;

      return `players:${playerId}.${suffix}`;
    }

    const stateAccess = {
      for: function forSave (saveId) {
        return {
          all: () => root[saveId].toJS(),
          get: key => wrapWithReadOnly(root[saveId])(key),
          unwrap: key => accessAndCloneState(root[saveId], key),
          for: function forNamespace (namespace) {
            return {
              get: key => wrapWithReadOnly(root[saveId].get(namespace))(key),
              unwrap: key => accessAndCloneState(root[saveId].get(namespace), key)
            };
          },
          player: function forPlayer (playerId) {
            return {
              for: function forNamespace (namespace) {
                return {
                  get: key => wrapWithReadOnly(root[saveId])(genKey(playerId, namespace, key)),
                  unwrap: key => accessAndCloneState(root[saveId], genKey(playerId, namespace, key))
                };
              },
              get: key => wrapWithReadOnly(root[saveId])(genKey(playerId, key)),
              unwrap: key => accessAndCloneState(root[saveId], genKey(playerId, key))
            };
          }
        };
      }
    };

    define()('StateAccess', function () {
      return stateAccess;
    });

    function isValidDotStringResult(result) {
      if (result.length !== 2) {
        logger.error({result}, 'Dot.String support for state mutation expects an array of length 2.');
        return false;
      }
      if (!isString(result[0])) {
        logger.error({result}, 'Dot.String support for state mutation requires the first entry be a string.');
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

    function stripOutAttemptsToMutateTrulyImmutableThings (result) {
      if (result._id) {
        delete result._id;
      }

      return result;
    }

    var applyResult;
    function applyPushAction (saveId, dotString, entries, value) {
      return applyResult(saveId, dotString, entries.push(Immutable.fromJS(value)));
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
          : entry.setIn(restOfPath.split(Dot), Immutable.fromJS(nv));
      });

      return Immutable.fromJS({}).setIn(pathToArray.split(Dot), Immutable.fromJS(mod));
    }

    const trailingHandlers = {
      '+': applyPushAction,
      '-': applyPopAction,
      '!': applyReplaceAction
    };

    applyResult = function (saveId, dotString, value) {
      const modifierSymbol = dotString[dotString.length - 1];
      const dotStringSansModifier = dotString.split(modifierSymbol)[0];

      // console.log(saveId, dotString, value);

      const handler = trailingHandlers[modifierSymbol];
      if (handler) {
        const entries = stateAccess.for(saveId).get(dotStringSansModifier);

        if (isFunction(value)) {
          logger.error({ dotString, prior: entries }, `Using a function on the ${modifierSymbol} operator is not supported. Remove the ${modifierSymbol} operator to acheive desired effect.`);

          return Immutable.fromJS({});
        }

        return handler(saveId, dotStringSansModifier, entries, value);
      } else if (includes(dotString, ':')) {
        return applyOnArrayElement(saveId, dotString, value);
      }

      let valueToApply = value;
      if (isFunction(value)) {
        const c = stateAccess.for(saveId).get(dotString);
        valueToApply = value(c);
      }

      return set({}, dotString, valueToApply);
    };

    function mutateNonArray (saveId, result) {
      let resultToMerge = result;

      if (isArray(result)) {
        if (!isValidDotStringResult(result)) {
          return;
        }

        resultToMerge = applyResult(saveId, result[0], result[1]);
      }

      resultToMerge = stripOutAttemptsToMutateTrulyImmutableThings(resultToMerge);

      function recurseMapsOnly (prev, next) {
        return Map.isMap(prev) ? prev.mergeWith(recurseMapsOnly, next) : Immutable.fromJS(next);
      }

      root[saveId] = root[saveId] || Immutable.fromJS({});
      root[saveId] = root[saveId].mergeWith(recurseMapsOnly, Immutable.fromJS(resultToMerge));
    }

    function isArrayOfArrays (result) {
      return filter(result, isArray).length === result.length;
    }

    function isPromise (result) {
      return (result instanceof Bluebird);
    }

    let oMutate;
    function mutateArrayOfArrays (saveId, results) {
      results.forEach(result => oMutate(saveId, result));
    }

    oMutate = function (saveId, result) {
      if (ignoreResult(result)) {
        return false;
      }

      if (isArrayOfArrays(result)) {
        return mutateArrayOfArrays(saveId, result);
      } else if (isPromise(result)) {
        return result.then(value => oMutate(saveId, value));
      }

      return mutateNonArray(saveId, result);
    };

    return function mutate (saveId, result) {
      return oMutate(saveId, result);
    };
  }
};