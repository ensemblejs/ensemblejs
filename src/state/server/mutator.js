'use strict';

import {isObject, isArray, isString, isEqual, cloneDeep, mergeWith as merge, each, filter, get, set, includes, replace, map, reject, isEmpty, isFunction} from 'lodash';

var logger = require('../../logging/server/logger').logger;
var saves = require('../../util/models/saves');
import {read} from '../../util/dot-string-support';

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

    function readAndWarnAboutMissingState (node, key) {
      var prop = read(node, key);

      if (prop === undefined) {
        logger.warn({ key: key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
      }

      return prop;
    }

    function provideReadAccessToState (node) {
      return function(key) {
        var prop = readAndWarnAboutMissingState(node, key);

        if (isObject(prop) && !isArray(prop)) {
          return provideReadAccessToState(prop);
        } else {
          return prop;
        }
      };
    }

    function accessAndCloneState (node, key) {
      var prop = readAndWarnAboutMissingState(node, key);

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

    var applyResult;
    function applyPushAction (saveId, dotString, entries, value) {
      return applyResult(saveId, dotString, entries.concat([value]));
    }

    function applyPopAction (saveId, dotString, entries, value) {
      return set({}, dotString, reject(entries, value));
    }

    function applyReplaceAction (saveId, dotString, entries, value) {
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
          logger.error({dotString: dotString, prior: entries}, `Using a function on the ${modifierSymbol} operator is not supported. Remove the ${modifierSymbol} operator to acheive desired effect.`);

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