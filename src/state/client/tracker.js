'use strict';

var each = require('lodash').each;
var isArray = require('lodash').isArray;
var isEqual = require('lodash').isEqual;
var clone = require('lodash').clone;
var where = require('lodash').where;

module.exports = {
  type: 'StateTracker',
  deps: ['DefinePlugin'],
  func: function StateTracker (define) {
    var latestServerState;
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

      return where(f(currentState), {id: model.id})[0];
    }

    function priorElement (f, model) {
      if (priorState === undefined) {
        return undefined;
      }

      return where(f(priorState), {id: model.id})[0];
    }

    function elementAdded (f, model) {
      return (where(f(priorState), {id: model.id}).length === 0);
    }

    function elementRemoved (f, model) {
      return (where(f(currentState), {id: model.id}).length === 0);
    }

    function elementChanged (f, model) {
      if (priorState === undefined) { return true; }

      var current = where(f(currentState), {id: model.id});
      var prior = where(f(priorState), {id: model.id});
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
          invokeCallbackWithId(
            change.callback,
            currentElement(change.focus, model),
            priorElement(change.focus, model),
            change.data
          );
        }
      });
    }

    function sendCurrentContentsNow (change) {
      invokeCallback(change.callback, currentValue(change.focus), undefined, change.data);
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
      rawState.resetTo(clone(latestServerState, true));
    }

    define()('OnSetup', ['RawStateAccess'], function StateTracker (rawState) {
      return function storeInitialServerState (state) {
        saveLatestServerState(state);
        resetRawStateBackToLatestServer(rawState());
        updateState(rawState().get());
      };
    });

    define()('OnPhysicsFrameComplete', ['RawStateAccess'], function StateTracker (rawState) {

      return function takeLatestCopyOfRawState () {
        updateState(rawState().get());
        detectChangesAndNotifyObservers();
        resetRawStateBackToLatestServer(rawState());
      };
    });

    define()('OnServerPacket', function StateTracker () {
      return function storeLatestServerState (packet) {
        saveLatestServerState(packet.gameState);
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

    function onChangeOf (model, callback, data) {
      var change = {
        type: 'object',
        focus: model,
        callback: callback,
        data: data
      };

      changes.push(change);
    }

    function onChangeTo (model, condition, callback, data) {
      var change = {
        type: 'object',
        focus: model,
        'when': condition,
        callback: callback,
        data: data
      };

      handleObjects(change);
      changes.push(change);
    }

    function onElementChanged (focusArray, callback, data) {
      var change = {
        type: 'array',
        focus: focusArray,
        callback: callback,
        detectionFunc: elementChanged,
        operatesOn: currentValue,
        data: data
      };

      changes.push(change);
    }

    function onElementAdded (focusArray, onCallback, existingCallback, data) {
      var change = {
        type: 'array',
        focus: focusArray,
        callback: onCallback,
        detectionFunc: elementAdded,
        operatesOn: currentValue,
        data: data
      };

      changes.push(change);

      if (!existingCallback) {
        return;
      }

      sendCurrentContentsNow({
        focus: focusArray,
        callback: existingCallback,
        data: data
      });
    }

    function onElementRemoved (focusArray, callback, data) {
      var change = {
        type: 'array',
        focus: focusArray,
        callback: callback,
        detectionFunc: elementRemoved,
        operatesOn: priorValue,
        data: data
      };

      changes.push(change);
    }

    return {
      onChangeOf: onChangeOf,
      onChangeTo: onChangeTo,
      onElementChanged: onElementChanged,
      onElementAdded: onElementAdded,
      onElementRemoved: onElementRemoved
    };
  }
};