'use strict';

import {isArray, isString, isEqual, isFunction, filter, find} from 'lodash';
import {read} from '../../util/dot-string-support';

var logger = require('../../logging/server/logger').logger;

module.exports = {
  type: 'StateTracker',
  deps: ['DefinePlugin'],
  func: function StateTracker (define) {
    var priorState;
    var currentState;
    var changes = [];

    function invokeCallback (callback, currentModel, priorModel, data) {
      var args = isArray(data) ? [].concat(data) : [data];

      args.unshift(priorModel);
      args.unshift(currentModel);

      callback(...args);
    }

    function addElementId (priorModel, currentModel) {
      return priorModel ? priorModel.id : currentModel.id;
    }

    function invokeCallbackWithId (callback, currentModel, priorModel, data, alwaysPassPrior = false) {
      var args = isArray(data) ? [].concat(data) : [data];

      if (priorModel || alwaysPassPrior) {
        args.unshift(priorModel);
      }
      if (currentModel) {
        args.unshift(currentModel);
      }

      args.unshift(addElementId(priorModel, currentModel));

      callback(...args);
    }

    function hasChanged (f, saveId) {
      if (priorState === undefined) { return true; }
      if (priorState[saveId] === undefined) { return true; }

      return !isEqual(f(priorState[saveId]), f(currentState[saveId]));
    }

    function currentValue (f, saveId) {
      if (currentState === undefined) {
        return undefined;
      }

      return f(currentState[saveId].toJS());
    }

    function priorValue (f, saveId) {
      if (priorState === undefined) {
        return undefined;
      }

      return f(priorState[saveId].toJS());
    }

    function currentElement (f, model, saveId) {
      if (currentState === undefined) {
        return undefined;
      }

      return find(f(currentState[saveId].toJS()), {id: model.id});
    }

    function priorElement (f, model, saveId) {
      if (priorState === undefined) {
        return undefined;
      }

      return find(f(priorState[saveId].toJS()), {id: model.id});
    }

    function elementAdded (f, model, saveId) {
      return (filter(f(priorState[saveId].toJS()), {id: model.id}).length === 0);
    }

    function elementRemoved (f, model, saveId) {
      return (filter(f(currentState[saveId].toJS()), {id: model.id}).length === 0);
    }

    function elementChanged (f, model, saveId) {
      if (priorState === undefined) { return true; }

      const current = filter(f(currentState[saveId].toJS()), {id: model.id});
      const prior = filter(f(priorState[saveId].toJS()), {id: model.id});

      return !isEqual(current, prior);
    }

    function handleObjects (change) {
      if (hasChanged(change.focus, change.saveId)) {
        if (!change.when) {
          invokeCallback(
            change.callback,
            currentValue(change.focus, change.saveId),
            priorValue(change.focus, change.saveId),
            change.data
          );

          return;
        }

        if (change.when(currentValue(change.focus, change.saveId))) {
          invokeCallback(
            change.callback,
            currentValue(change.focus, change.saveId),
            priorValue(change.focus, change.saveId),
            change.data
          );
        }
      }
    }

    function handleArrays (change) {
      change.operatesOn(change.focus, change.saveId).forEach(model => {
        if (change.detectionFunc(change.focus, model, change.saveId)) {
          invokeCallbackWithId(
            change.callback,
            currentElement(change.focus, model, change.saveId),
            priorElement(change.focus, model, change.saveId),
            change.data,
            change.alwaysPassPrior
          );
        }
      });
    }

    function sendCurrentContentsNow (change) {
      currentValue(change.focus, change.saveId).forEach(element => {
        invokeCallbackWithId(change.callback, element, undefined, change.data);
      });
    }

    var handle = {
      'array': handleArrays,
      'object': handleObjects
    };

    function detectChangesAndNotifyObservers () {
      changes.forEach(change => handle[change.type](change));
    }

    define()('OnServerReady', ['RawStateAccess'], rawState => {
      return function storeInitialServerState () {
        priorState = currentState;
        currentState = rawState().all();
      };
    });

    define()('AfterPhysicsFrame', ['RawStateAccess'], rawState => {
      return function takeLatestCopyOfRawState () {
        priorState = currentState;
        currentState = rawState().all();
        detectChangesAndNotifyObservers();
      };
    });

    function functionifyDotStrings (model) {
      if (!isString(model)) {
        return model;
      }

      return function stateFromDotString (state) {
        var prop = read(state, model);
        if (prop === undefined) {
          logger.warn({ model, state}, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
        }

        return prop;
      };
    }

    function functionifyIfRequired (condition) {
      if (!isFunction(condition)) {
        return function equals (current) {
          return isEqual(current, condition);
        };
      }

      return condition;
    }

    return {
      for: function filterTrackerBySaveId (saveId) {

        function onChangeOf (model, callback, data) {
          var change = {
            saveId: saveId,
            type: 'object',
            focus: functionifyDotStrings(model),
            rawFocus: model,
            callback: callback,
            data: data
          };

          invokeCallback(callback, currentValue(change.focus, saveId), priorValue(change.focus, saveId), data);
          changes.push(change);
        }

        function onChangeTo (model, condition, callback, data) {
          var when = functionifyIfRequired(condition);

          var change = {
            saveId: saveId,
            type: 'object',
            focus: functionifyDotStrings(model),
            rawFocus: model,
            'when': when,
            callback: callback,
            data: data
          };


          if (change.when(currentValue(change.focus, saveId))) {
            invokeCallback(
              change.callback,
              currentValue(change.focus, saveId),
              priorValue(change.focus, saveId),
              change.data
            );
          }

          changes.push(change);
        }

        function onElementChanged (focusArray, callback, data) {
          var change = {
            saveId: saveId,
            type: 'array',
            focus: functionifyDotStrings(focusArray),
            rawFocus: focusArray,
            callback: callback,
            detectionFunc: elementChanged,
            operatesOn: currentValue,
            data: data
          };

          changes.push(change);
        }

        function onElementAdded (focusArray, onCallback, data) {
          var change = {
            saveId: saveId,
            type: 'array',
            focus: functionifyDotStrings(focusArray),
            rawFocus: focusArray,
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
            saveId: saveId,
            type: 'array',
            focus: functionifyDotStrings(focusArray),
            rawFocus: focusArray,
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