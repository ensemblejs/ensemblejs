import isString from 'lodash/isString';
import isFunction from 'lodash/isFunction';
import deepEqual from 'deep-equal';
import Immutable from 'immutable';
import {read} from './dot-string-support';
import {join} from './array';
import {isArray} from './is';

function invoke (callback, currentModel, priorModel, data) {
  const args = isArray(data) ? join([], data) : [data];

  args.unshift(priorModel);
  args.unshift(currentModel);

  callback(...args);
}

function addElementId (priorModel, currentModel) {
  return priorModel ? priorModel.get('id') : currentModel.get('id');
}

function invokeWithId (callback, currentModel, priorModel, data, alwaysPassPrior = false) {
  const args = isArray(data) ? join([], data) : [data];

  if (priorModel !== undefined || alwaysPassPrior) {
    args.unshift(priorModel);
  }
  if (currentModel !== undefined) {
    args.unshift(currentModel);
  }

  args.unshift(addElementId(priorModel, currentModel));

  callback(...args);
}

const getById = (arr, id) => arr.find(e => e.get('id') === id);
const isInArray = (arr, id) => getById(arr, id) === undefined;

function functionifyDotStrings (model) {
  if (!isString(model)) {
    return model;
  }

  return function stateFromDotString (state) {
    let prop = read(state, model);
    if (prop === undefined) {
      console.warn({model, state}, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
    }

    return prop;
  };
}

function functionifyIfRequired (condition) {
  if (!isFunction(condition)) {
    return (current) => deepEqual(current, condition);
  }

  return condition;
}

export default function stateChangeEvents () {
  let priorState;
  let currentState;
  const changes = [];

  function hasChanged (f) {
    if (priorState === undefined) { return true; }

    return !deepEqual(f(priorState), f(currentState));
  }

  function currentValue (f) {
    if (currentState === undefined) {
      return undefined;
    }

    return f(currentState);
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

    return getById(f(currentState), model.get('id'));
  }

  function priorElement (f, model) {
    if (priorState === undefined) {
      return undefined;
    }

    return getById(f(priorState), model.get('id'));
  }

  function elementAdded (f, model) {
    return isInArray(f(priorState), model.get('id'));
  }

  function elementRemoved (f, model) {
    return isInArray(f(currentState), model.get('id'));
  }

  function elementChanged (f, model) {
    if (priorState === undefined) { return true; }

    const current = getById(f(currentState), model.get('id'));
    const prior = getById(f(priorState), model.get('id'));

    return !Immutable.is(current, prior);
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
    change.operatesOn(change.focus).forEach(function changeModel (model) {
      if (change.detectionFunc(change.focus, model)) {

        const current = currentElement(change.focus, model);
        const prior = priorElement(change.focus, model);

        if (current === undefined && prior === undefined) {
          console.error({ change }, 'Attempting to track changes in array where not all elements have an "id" property.');
          return;
        }

        invokeWithId(
          change.callback,
          current,
          prior,
          change.data,
          change.alwaysPassPrior
        );
      }
    });
  }

  function sendCurrentContentsNow (change) {
    currentValue(change.focus).forEach(function(element) {
      invokeWithId(change.callback, element, undefined, change.data);
    });
  }

  const handle = {
    'array': handleArrays,
    'object': handleObjects
  };

  function detectChangesAndNotifyObservers () {
    changes.forEach(change => handle[change.type](change));
  }

  function updateState (newState) {
    priorState = currentState;
    currentState = null;
    currentState = newState;
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

  return {
    updateState,
    detectChangesAndNotifyObservers,
    currentValue,
    onChangeOf,
    onChangeTo,
    onElement,
    onElementChanged,
    onElementAdded,
    onElementRemoved
  };
}