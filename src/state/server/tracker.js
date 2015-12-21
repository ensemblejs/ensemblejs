'use strict';

var each = require('lodash').each;
var isArray = require('lodash').isArray;
var isString = require('lodash').isString;
var isEqual = require('lodash').isEqual;
var isFunction = require('lodash').isFunction;
var clone = require('lodash').clone;
var find = require('lodash').find;
var where = require('lodash').where;
var get = require('lodash').get;

module.exports = {
  type: 'StateTracker',
  deps: ['DefinePlugin', 'Logger'],
  func: function StateTracker (define, logger) {
    var priorState;
    var currentState;
    var changes = [];

    function invokeCallback (callback, currentModel, priorModel, data) {
      var args = isArray(data) ? clone(data) : [data];

      args.unshift(priorModel);
      args.unshift(currentModel);

      callback.apply(undefined, args);
    }

    function invokeCallbackWithId (callback, currentModel, priorModel, data) {
      var args = isArray(data) ? clone(data) : [data];

      if (priorModel) {
        args.unshift(priorModel);
      }
      if (currentModel) {
        args.unshift(currentModel);
      }

      args.unshift((priorModel) ? priorModel.id : currentModel.id);

      callback.apply(undefined, args);
    }

    function hasChanged (f, gameId) {
      if (priorState === undefined) { return true; }

      return !isEqual(f(priorState[gameId]), f(currentState[gameId]));
    }

    function currentValue (f, gameId) {
      if (currentState === undefined) {
        return undefined;
      }

      return f(currentState[gameId]);
    }

    function priorValue (f, gameId) {
      if (priorState === undefined) {
        return undefined;
      }

      return f(priorState[gameId]);
    }

    function currentElement (f, model, gameId) {
      if (currentState === undefined) {
        return undefined;
      }

      return find(f(currentState[gameId]), {id: model.id});
    }

    function priorElement (f, model, gameId) {
      if (priorState === undefined) {
        return undefined;
      }

      return find(f(priorState[gameId]), {id: model.id});
    }

    function elementAdded (f, model, gameId) {
      return (where(f(priorState[gameId]), {id: model.id}).length === 0);
    }

    function elementRemoved (f, model, gameId) {
      return (where(f(currentState[gameId]), {id: model.id}).length === 0);
    }

    function elementChanged (f, model, gameId) {
      if (priorState === undefined) { return true; }

      var current = where(f(currentState[gameId]), {id: model.id});
      var prior = where(f(priorState[gameId]), {id: model.id});
      return !isEqual(current, prior);
    }

    function handleObjects (change) {
      if (hasChanged(change.focus, change.gameId)) {
        if (!change.when) {
          invokeCallback(
            change.callback,
            currentValue(change.focus, change.gameId),
            priorValue(change.focus, change.gameId),
            change.data
          );

          return;
        }

        if (change.when(currentValue(change.focus, change.gameId))) {
          invokeCallback(
            change.callback,
            currentValue(change.focus, change.gameId),
            priorValue(change.focus, change.gameId),
            change.data
          );
        }
      }
    }

    function handleArrays (change) {
      each(change.operatesOn(change.focus, change.gameId), function (model) {
        if (change.detectionFunc(change.focus, model, change.gameId)) {
          invokeCallbackWithId(
            change.callback,
            currentElement(change.focus, model, change.gameId),
            priorElement(change.focus, model, change.gameId),
            change.data
          );
        }
      });
    }

    function sendCurrentContentsNow (change) {
      each(currentValue(change.focus, change.gameId), function(element) {
        invokeCallbackWithId(change.callback, element, undefined, change.data);
      });
    }

    var handle = {
      'array': handleArrays,
      'object': handleObjects
    };

    function detectChangesAndNotifyObservers () {
      each(changes, function (change) {
        handle[change.type](change);
      });
    }

    define()('OnServerReady', ['RawStateAccess'], function StateTracker (rawState) {
      return function storeInitialServerState () {
        priorState = currentState;
        currentState = rawState().all();
      };
    });

    define()('AfterPhysicsFrame', ['RawStateAccess'], function StateTracker (rawState) {

      return function takeLatestCopyOfRawState () {
        priorState = currentState;
        currentState = clone(rawState().all(), true);
        detectChangesAndNotifyObservers();
      };
    });

    function functionifyDotStrings (model) {
      if (!isString(model)) {
        return model;
      }

      return function stateFromDotString (state) {
        var prop = get(state, model);
        if (prop === undefined) {
          logger().warn({ model: model, state: state}, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
        }

        return prop;
      };
    }

    function functionifyIfRequired (condition) {
      if (!isFunction(condition)) {
        return function equals (currentValue) {
          return isEqual(currentValue, condition);
        };
      } else {
        return condition;
      }
    }

    return {
      for: function filterTrackerByGameId (gameId) {

        function onChangeOf (model, callback, data) {
          var change = {
            gameId: gameId,
            type: 'object',
            focus: functionifyDotStrings(model),
            callback: callback,
            data: data
          };

          invokeCallback(callback, currentValue(change.focus, gameId), priorValue(change.focus, gameId), data);
          changes.push(change);
        }

        function onChangeTo (model, condition, callback, data) {
          var when = functionifyIfRequired(condition);

          var change = {
            gameId: gameId,
            type: 'object',
            focus: functionifyDotStrings(model),
            'when': when,
            callback: callback,
            data: data
          };


          if (change.when(currentValue(change.focus, gameId))) {
            invokeCallback(
              change.callback,
              currentValue(change.focus, gameId),
              priorValue(change.focus, gameId),
              change.data
            );
          }

          changes.push(change);
        }

        function onElementChanged (focusArray, callback, data) {
          var change = {
            gameId: gameId,
            type: 'array',
            focus: functionifyDotStrings(focusArray),
            callback: callback,
            detectionFunc: elementChanged,
            operatesOn: currentValue,
            data: data
          };

          changes.push(change);
        }

        function onElementAdded (focusArray, onCallback, data) {
          var change = {
            gameId: gameId,
            type: 'array',
            focus: functionifyDotStrings(focusArray),
            callback: onCallback,
            detectionFunc: elementAdded,
            operatesOn: currentValue,
            data: data
          };

          changes.push(change);

          sendCurrentContentsNow(change);
        }

        function onElementRemoved (focusArray, callback, data) {
          var change = {
            gameId: gameId,
            type: 'array',
            focus: functionifyDotStrings(focusArray),
            callback: callback,
            detectionFunc: elementRemoved,
            operatesOn: priorValue,
            data: data
          };

          changes.push(change);
        }

        function onElement (focusArray, added, changed, removed, data) {
          onElementAdded(focusArray, added, data);
          onElementChanged(focusArray, changed, data);
          onElementRemoved(focusArray, removed, data);
        }

        return {
          onChangeOf: onChangeOf,
          onChangeTo: onChangeTo,
          onElement: onElement,
          onElementChanged: onElementChanged,
          onElementAdded: onElementAdded,
          onElementRemoved: onElementRemoved
        };
      }
    };
  }
};