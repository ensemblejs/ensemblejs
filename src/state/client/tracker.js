'use strict';

import {each, isString, isFunction, find} from 'lodash';
import {read} from '../../util/dot-string-support';
import {getById, join} from '../../util/array';
import deepEqual from 'deep-equal';
import {isArray} from '../../util/is';
const Immutable = require('immutable');

module.exports = {
  type: 'StateTracker',
  deps: ['DefinePlugin', 'Logger'],
  func: function StateTracker (define, logger) {
    // let nextServerState;
    let priorState;
    let currentState;
    let priorStateAsJS;
    let currentStateAsJS;
    let changes = [];

    function invoke (callback, currentModel, priorModel, data) {
      const args = isArray(data) ? join([], data) : [data];

      args.unshift(priorModel);
      args.unshift(currentModel);

      callback(...args);
    }

    function addElementId (priorModel, currentModel) {
      return priorModel ? priorModel.id : currentModel.id;
    }

    function invokeWithId (callback, currentModel, priorModel, data, alwaysPassPrior = false) {
      const args = isArray(data) ? join([], data) : [data];

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

      return !deepEqual(f(priorStateAsJS), f(currentStateAsJS));
    }

    function currentValue (f) {
      if (currentState === undefined) {
        return undefined;
      }

      return f(currentStateAsJS);
    }

    // function currentServerValue (f) {
    //   if (nextServerState === undefined) {
    //     return undefined;
    //   }

    //   return f(nextServerState.toJS());
    // }

    function priorValue (f) {
      if (priorState === undefined) {
        return undefined;
      }

      return f(priorStateAsJS);
    }

    function currentElement (f, model) {
      if (currentState === undefined) {
        return undefined;
      }

      return find(f(currentStateAsJS), {id: model.id});
    }

    function priorElement (f, model) {
      if (priorState === undefined) {
        return undefined;
      }

      return find(f(priorStateAsJS), {id: model.id});
    }

    function isInArray (array, id) {
      for (let i = 0; i < array.length; i += 1) {
        if (array[i].id === id) {
          return false;
        }
      }

      return true;
    }

    function elementAdded (f, model) {
      return isInArray(f(priorStateAsJS), model.id);
    }

    function elementRemoved (f, model) {
      return isInArray(f(currentStateAsJS), model.id);
    }

    function elementChanged (f, model) {
      if (priorState === undefined) { return true; }

      const current = getById(f(currentStateAsJS), model.id);
      const prior = getById(f(priorStateAsJS), model.id);

      return !deepEqual(current, prior);
    }

    function handleObjects (change) {
      if (hasChanged(change.focus)) {
        if (!change.when) {
          invoke(
            change.callback,
            currentValue(change.focus),
            priorValue(change.focus),
            change.data
          );

          return;
        }

        if (change.when(currentValue(change.focus))) {
          invoke(
            change.callback,
            currentValue(change.focus),
            priorValue(change.focus),
            change.data
          );
        }
      }
    }

    function handleArrays (change) {
      each(change.operatesOn(change.focus), function changeModel (model) {
        if (change.detectionFunc(change.focus, model)) {

          if (!currentElement(change.focus, model) && !priorElement(change.focus, model)) {
            logger().error({change: change}, 'Attempting to track changes in array where not all elements have an "id" property.');
            return;
          }

          invokeWithId(
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
        invokeWithId(change.callback, element, undefined, change.data);
      });
    }

    let handle = {
      'array': handleArrays,
      'object': handleObjects
    };

    function updateMutableView () {
      if (priorState) {
        priorStateAsJS = priorState.toJS();
      }
      if (currentState) {
        currentStateAsJS = currentState.toJS();
      }
    }

    function detectChangesAndNotifyObservers () {
      updateMutableView();
      each(changes, change => handle[change.type](change));
    }

    function updateState (newState) {
      priorState = currentState;
      currentState = null;
      currentState = newState;
    }

    // function saveInitialServerState (serverState) {
    //   nextServerState = Immutable.fromJS(serverState);
    // }

    // function saveLatestServerState (changeDeltas) {
    //   changeDeltas.forEach(console.log);

    //   changeDeltas.forEach(delta => mutate()(delta));
    //   applyPendingMerges()();
    // }

    define()('OnClientStart', ['RawStateAccess'], rawState => {
      return function storeInitialServerState (state) {
        // saveInitialServerState(state);
        rawState().resetTo(Immutable.fromJS(state));
        updateState(rawState().get());

        updateMutableView();
      };
    });

    define()('AfterPhysicsFrame', ['RawStateAccess'], rawState => {
      return function takeLatestCopyOfRawState () {
        updateState(rawState().get());
        detectChangesAndNotifyObservers();
      };
    });

    // define()('OnIncomingServerPacket', ['RawStateAccess'], () => {
    //   return function storeLatestServerState (packet) {
    //     saveLatestServerState(packet.changeDeltas);
    //   };
    // });

    define()('CurrentState', () => {
      return {
        get: currentValue
      };
    });

    define()('CurrentServerState', () => {
      return {
        get: currentValue
      };
    });

    function functionifyDotStrings (model) {
      if (!isString(model)) {
        return model;
      }

      return function stateFromDotString (state) {
        let prop = read(state, model);
        if (prop === undefined) {
          logger().warn({model, state}, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
        }

        return prop;
      };
    }

    function onChangeOf (model, callback, data) {
      let change = {
        type: 'object',
        originalFocus: model,
        focus: functionifyDotStrings(model),
        callback: callback,
        data: data
      };

      invoke(callback, currentValue(change.focus), priorValue(change.focus), data);
      changes.push(change);
    }

    function functionifyIfRequired (condition) {
      if (!isFunction(condition)) {
        return function equals (current) {
          return deepEqual(current, condition);
        };
      }

      return condition;
    }

    function onChangeTo (model, condition, callback, data) {
      let when = functionifyIfRequired(condition);

      let change = {
        type: 'object',
        originalFocus: model,
        focus: functionifyDotStrings(model),
        'when': when,
        callback: callback,
        data: data
      };

      if (change.when(currentValue(change.focus))) {
        invoke(
          change.callback,
          currentValue(change.focus),
          priorValue(change.focus),
          change.data
        );
      }

      changes.push(change);
    }

    function onElementChanged (focusArray, callback, data) {
      let change = {
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
      let change = {
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
      let change = {
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

    return { onChangeOf, onChangeTo, onElement, onElementChanged, onElementAdded, onElementRemoved };
  }
};