import isArray from 'lodash/isArray';
import isString from 'lodash/isString';
import isEqual from 'lodash/isEqual';
import isFunction from 'lodash/isFunction';
import filter from 'lodash/filter';
import find from 'lodash/find';
import { clone } from './fast-clone';
import read from 'ok-selector';

function invokeCallback (callback, currentModel, priorModel, data) {
  const args = isArray(data) ? [].concat(data) : [data];

  args.unshift(priorModel);
  args.unshift(currentModel);

  callback(...args);
}

function addElementId (priorModel, currentModel) {
  return priorModel ? priorModel.id : currentModel.id;
}

function invokeCallbackWithId (callback, currentModel, priorModel, data, alwaysPassPrior = false) {
  const args = isArray(data) ? [].concat(data) : [data];

  if (priorModel || alwaysPassPrior) {
    args.unshift(priorModel);
  }
  if (currentModel) {
    args.unshift(currentModel);
  }

  args.unshift(addElementId(priorModel, currentModel));

  callback(...args);
}

function functionifyDotStrings (model) {
  if (!isString(model)) {
    return model;
  }

  return function stateFromDotString (state) {
    const prop = read(state, model);
    if (prop === undefined) {
      console.warn({ model, state}, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
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

export default function stateChangeEvents () {
  let priorState;
  let currentState;
  const changes = [];

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

    const current = filter(f(currentState), {id: model.id});
    const prior = filter(f(priorState), {id: model.id});

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
    change.operatesOn(change.focus).forEach(model => {
      if (change.detectionFunc(change.focus, model)) {
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
    currentValue(change.focus).forEach(element => {
      invokeCallbackWithId(change.callback, element, undefined, change.data);
    });
  }

  const handle = {
    'array': handleArrays,
    'object': handleObjects
  };

  function detectChangesAndNotifyObservers () {
    changes.forEach(change => handle[change.type](change));
  }

  function onChangeOf (model, callback, data) {
    const change = {
      type: 'object',
      focus: functionifyDotStrings(model),
      rawFocus: model,
      callback: callback,
      data: data
    };

    invokeCallback(callback, currentValue(change.focus), priorValue(change.focus), data);
    changes.push(change);
  }

  function onChangeTo (model, condition, callback, data) {
    const when = functionifyIfRequired(condition);

    const change = {
      type: 'object',
      focus: functionifyDotStrings(model),
      rawFocus: model,
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
    const change = {
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
    const change = {
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
    const change = {
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

  function updateState (newState) {
    priorState = clone(currentState);
    currentState = null;
    currentState = clone(newState);
  }

  return {
    updateState,
    detectChangesAndNotifyObservers,
    onChangeOf,
    onChangeTo,
    onElement,
    onElementChanged,
    onElementAdded,
    onElementRemoved
  };
}
