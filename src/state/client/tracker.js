'use strict';

import {each, isArray, isString, isEqual, isFunction, cloneDeep, filter, find} from 'lodash';
import {read} from '../../util/dot-string-support';

module.exports = {
  type: 'StateTracker',
  deps: ['DefinePlugin', 'Logger'],
  func: function StateTracker (define, logger) {
    var latestServerState;
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

    function hasChanged (f) {
      if (priorState === undefined) { return true; }

      return !isEqual(f(priorState), f(currentState));
    }

    function currentValue (f) {
      if (currentState === undefined) {
        return undefined;
      }

      return f(currentState);
    }

    function currentServerValue (f) {
      if (latestServerState === undefined) {
        return undefined;
      }

      return f(latestServerState);
    }

    function priorValue (f) {
      if (priorState === undefined) {
        return undefined;
      }

      return f(priorState);
    }

    function currentElement (f, model) {
      if (currentState === undefined) {
        return undefined;
      }


      return find(f(currentState), {id: model.id});
    }

    function priorElement (f, model) {
      if (priorState === undefined) {
        return undefined;
      }

      return find(f(priorState), {id: model.id});
    }

    function elementAdded (f, model) {
      return (filter(f(priorState), {id: model.id}).length === 0);
    }

    function elementRemoved (f, model) {
      return (filter(f(currentState), {id: model.id}).length === 0);
    }

    function elementChanged (f, model) {
      if (priorState === undefined) { return true; }

      var current = filter(f(currentState), {id: model.id});
      var prior = filter(f(priorState), {id: model.id});
      return !isEqual(current, prior);
    }

    function handleObjects (change) {
      if (hasChanged(change.focus)) {
        if (!change.when) {
          invokeCallback(
            change.callback,
            currentValue(change.focus),
            priorValue(change.focus),
            change.data
          );

          return;
        }

        if (change.when(currentValue(change.focus))) {
          invokeCallback(
            change.callback,
            currentValue(change.focus),
            priorValue(change.focus),
            change.data
          );
        }
      }
    }

    function handleArrays (change) {
      each(change.operatesOn(change.focus), function (model) {
        if (change.detectionFunc(change.focus, model)) {

          if (!currentElement(change.focus, model) && !priorElement(change.focus, model)) {
            logger().error({change: change}, 'Attempting to track changes in array where not all elements have an "id" property.');
            return;
          }

          invokeCallbackWithId(
            change.callback,
            currentElement(change.focus, model),
            priorElement(change.focus, model),
            change.data,
            change.alwaysPassPrior
          );
        }
      });
    }

    function sendCurrentContentsNow (change) {
      each(currentValue(change.focus), function(element) {
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

    function updateState (newState) {
      priorState = currentState;
      currentState = newState;
    }

    function saveLatestServerState (serverState) {
      latestServerState = serverState;
    }

    function resetRawStateBackToLatestServer (rawState) {
      rawState.resetTo(cloneDeep(latestServerState));
    }

    define()('OnClientStart', ['RawStateAccess'], function StateTracker (rawState) {
      return function storeInitialServerState (state) {
        saveLatestServerState(state);
        resetRawStateBackToLatestServer(rawState());
        updateState(rawState().get());
      };
    });

    define()('AfterPhysicsFrame', ['RawStateAccess'], function StateTracker (rawState) {
      return function takeLatestCopyOfRawState () {
        updateState(rawState().get());
        detectChangesAndNotifyObservers();
        resetRawStateBackToLatestServer(rawState());
      };
    });

    define()('OnIncomingServerPacket', function StateTracker () {
      return function storeLatestServerState (packet) {
        saveLatestServerState(packet.saveState);
      };
    });

    define()('CurrentState', function StateTracker () {
      return {
        get: function get (model) { return currentValue(model); }
      };
    });

    define()('CurrentServerState', function StateTracker () {
      return {
        get: function get (model) { return currentServerValue(model); }
      };
    });

    function functionifyDotStrings (model) {
      if (!isString(model)) {
        return model;
      }

      return function stateFromDotString (state) {
        var prop = read(state, model);
        if (prop === undefined) {
          logger().warn({ model: model, state: state}, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
        }

        return prop;
      };
    }

    function onChangeOf (model, callback, data) {
      var change = {
        type: 'object',
        originalFocus: model,
        focus: functionifyDotStrings(model),
        callback: callback,
        data: data
      };

      invokeCallback(callback, currentValue(change.focus), priorValue(change.focus), data);
      changes.push(change);
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

    function onChangeTo (model, condition, callback, data) {
      var when = functionifyIfRequired(condition);

      var change = {
        type: 'object',
        originalFocus: model,
        focus: functionifyDotStrings(model),
        'when': when,
        callback: callback,
        data: data
      };

      if (change.when(currentValue(change.focus))) {
        invokeCallback(
          change.callback,
          currentValue(change.focus),
          priorValue(change.focus),
          change.data
        );
      }

      changes.push(change);
    }

    function onElementChanged (focusArray, callback, data) {
      var change = {
        type: 'array',
        originalFocus: focusArray,
        focus: functionifyDotStrings(focusArray),
        callback: callback,
        detectionFunc: elementChanged,
        operatesOn: currentValue,
        data: data,
        alwaysPassPrior: true
      };

      changes.push(change);
    }

    function onElementAdded (focusArray, onCallback, data) {
      var change = {
        type: 'array',
        originalFocus: focusArray,
        focus: functionifyDotStrings(focusArray),
        callback: onCallback,
        detectionFunc: elementAdded,
        operatesOn: currentValue,
        data: data,
        alwaysPassPrior: false
      };

      changes.push(change);

      sendCurrentContentsNow(change);
    }

    function onElementRemoved (focusArray, callback, data) {
      var change = {
        type: 'array',
        originalFocus: focusArray,
        focus: functionifyDotStrings(focusArray),
        callback: callback,
        detectionFunc: elementRemoved,
        operatesOn: priorValue,
        data: data,
        alwaysPassPrior: false
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