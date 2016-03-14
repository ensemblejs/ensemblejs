'use strict';

import {isObject, isArray, isString, isEqual, cloneDeep, mergeWith as merge, each, filter, get, set, includes, replace, first, map, endsWith, reject, isEmpty} from 'lodash';

var logger = require('../../logging/server/logger').logger;
var saves = require('../../util/models/saves');

import Bluebird from 'bluebird';

var root = {};

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin'],
  func: function StateMutator (define) {

    define()('RawStateAccess', function RawStateAccess () {
      return {
        for: function forSave (saveId) {
          return root[saveId];
        },
        all: function all () {
          return root;
        }
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
          root[save.id] = resetSaveOnLoad(state);

          on().saveReady(save);
        }

        return saves.getById(save.id).then(keepInMemory);
      };
    });

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
        logger.warn({ key: key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
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
      for: function forSave (saveId) {
        return {
          get: function getUsingDotString (key) {
            return provideReadAccessToState(root[saveId])(key);
          },
          unwrap: function unwrap (key) {
            return accessAndCloneState(root[saveId], key);
          },
          for: function forNamespace (namespace) {
            return {
              get: function get (key) {
                return provideReadAccessToState(root[saveId][namespace])(key);
              },
              unwrap: function unwrap (key) {
                return accessAndCloneState(root[saveId][namespace], key);
              },
            };
          },
          player: function forPlayer (playerId) {
            var playerKey = `player${playerId}`;

            return {
              for: function forNamespace (namespace) {
                return {
                  get: function get (key) {
                    return provideReadAccessToState(root[saveId][playerKey][namespace])(key);
                  },
                  unwrap: function unwrap (key) {
                    return accessAndCloneState(root[saveId][playerKey][namespace], key);
                  },
                };
              },
              get: function get (key) {
                return provideReadAccessToState(root[saveId][playerKey])(key);
              },
              unwrap: function unwrap (key) {
                return accessAndCloneState(root[saveId][playerKey], key);
              },
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
        logger.error(result, 'Dot.String support for state mutation expects an array of length 2.');
        return false;
      }
      if (!isString(result[0])) {
        logger.error(result, 'Dot.String support for state mutation requires the first entry be a string.');
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

    function replaceArrayDontMerge (a, b) {
      return isArray(a) ? b : undefined;
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

    function applyOnArrayElement (saveId, dotString, value) {
      const pathToArray = dotString.split(':')[0];
      const id = parseInt(dotString.split(':')[1], 10);
      const restOfPath = replace(dotString.split(':')[1], /^[0-9]+\.?/, '');

      let entries = stateAccess.for(saveId).unwrap(pathToArray);


      let mod = map(entries, entry => {
        if (entry.id !== id) {
          return entry;
        }

        return isEmpty(restOfPath) ? merge(entry, value) : set(entry, restOfPath, value);
      });

      return set({}, pathToArray, mod);
    }

    function applyResult (saveId, dotString, value) {
      if (endsWith(dotString, '+')) {
        return applyPlusResult(saveId, dotString.split('+')[0], value);
      } else if (endsWith(dotString, '-')) {
        return applyMinusResult(saveId, dotString.split('-')[0], value);
      } else if (endsWith(dotString, '!')) {
        return applyModifiyResult(saveId, dotString.split('!')[0], value);
      } else if (includes(dotString, ':')) {
        return applyOnArrayElement(saveId, dotString, value);
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


      result = stripOutAttemptsToMutateTrulyImmutableThings(result);

      root[saveId] = root[saveId] || {};
      merge(root[saveId], result, replaceArrayDontMerge);
    }

    function isArrayOfArrays (result) {
      return filter(result, isArray).length === result.length;
    }

    function isPromise (result) {
      return (result instanceof Bluebird);
    }

    function handleResult (saveId, result) {
      if (ignoreResult(result)) {
        return false;
      }


      function mutateArrayOfArrays (saveId, result) {
        each(result, function(resultItem) {
          handleResult(saveId, resultItem);
        });
      }

      if (isArrayOfArrays(result)) {
        mutateArrayOfArrays(saveId, result);
      } else if (isPromise(result)) {
        return result.then(value => {
          return handleResult(saveId, value);
        });
      } else {
        mutateNonArray(saveId, result);
      }
    }

    return handleResult;
  }
};