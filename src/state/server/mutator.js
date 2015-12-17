'use strict';

var isObject = require('lodash').isObject;
var isArray = require('lodash').isArray;
var isString = require('lodash').isString;
var isEqual = require('lodash').isEqual;
var cloneDeep = require('lodash').cloneDeep;
var merge = require('lodash').merge;
var each = require('lodash').each;
var select = require('lodash').select;
var get = require('lodash').get;

var root = {};

module.exports = {
  type: 'StateMutator',
  deps: ['DefinePlugin', 'Logger', 'On'],
  func: function StateMutator (define, logger, on) {

    define()('RawStateAccess', function RawStateAccess () {
      return {
        for: function forGame (gameId) {
          return root[gameId];
        },
        all: function all () {
          return root;
        }
      };
    });

    function resetGameOnLoad (state) {
      state.ensemble.waitingForPlayers = true;
      state.ensemble.paused = true;

      return state;
    }

    define()('OnLoadGame', ['GamesDataModel'], function (games) {
      return function loadGameFromDb (game) {
        function store (state) {
          root[game.id] = resetGameOnLoad(state);

          on().gameReady(game);
        }

        games().get(game.id, store);
      };
    });

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

    define()('StateAccess', function () {
      return {
        for: function forGame (gameId) {
          return {
            get: function getUsingDotString (key) {
              return provideReadAccessToState(root[gameId])(key);
            },
            unwrap: function unwrap (key) {
              return accessAndCloneState(root[gameId], key);
            },
            for: function forNamespace (namespace) {
              return {
                get: function get (key) {
                  return provideReadAccessToState(root[gameId][namespace])(key);
                },
                unwrap: function unwrap (key) {
                  return accessAndCloneState(root[gameId][namespace], key);
                },
              };
            },
            player: function forPlayer (playerId) {
              return {
                for: function forNamespace (namespace) {
                  return {
                    get: function get (key) {
                      return provideReadAccessToState(root[gameId].player[playerId][namespace])(key);
                    },
                    unwrap: function unwrap (key) {
                      return accessAndCloneState(root[gameId].player[playerId][namespace], key);
                    },
                  };
                },
                get: function get (key) {
                  return provideReadAccessToState(root[gameId].player[playerId])(key);
                },
                unwrap: function unwrap (key) {
                  return accessAndCloneState(root[gameId].player[playerId], key);
                },
              };
            }
          };
        }
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

    function stripOutAttemptsToMutateTrulyImmutableThings (result) {
      if (result._id) {
        delete result._id;
      }

      return result;
    }

    function mutateNonArray (gameId, result) {
      if (isArray(result)) {
        if (!isValidDotStringResult(result)) {
          return;
        }

        result = mapDotStringResultToObject(result);
      }

      result = stripOutAttemptsToMutateTrulyImmutableThings(result);

      root[gameId] = root[gameId] || {};
      root[gameId] = merge(root[gameId], result, function mergeArrays (a, b) {
        return isArray(a) ? b : undefined;
      });
    }

    function isArrayOfArrays (result) {
      return select(result, isArray).length === result.length;
    }

    function mutateArrayOfArrays (gameId, result) {
      each(result, function(resultItem) {
        handleResult(gameId, resultItem);
      });
    }

    function handleResult (gameId, result) {
      if (ignoreResult(result)) {
        return false;
      }

      if (isArrayOfArrays(result)) {
        mutateArrayOfArrays(gameId, result);
      } else {
        mutateNonArray(gameId, result);
      }
    }

    return handleResult;
  }
};