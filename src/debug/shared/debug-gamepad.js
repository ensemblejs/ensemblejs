'use strict';

let each = require('lodash').each;
let reject = require('lodash').reject;
let select = require('lodash').select;
let merge = require('lodash').merge;

function StateSeed () {
  return { ensembleDebug: { buttons: [] } };
}

function createKeyDownFunc (key) {
  return function (state) {
    let keys = state.get('ensembleDebug.buttons');

    if (select(keys, {id: key}).length > 0) {
      return {};
    }

    keys.push({id: key});

    return ['ensembleDebug.buttons', keys];
  };
}

function createKeyUpFunc (key) {
  return function (state) {
    let keys = state.get('ensembleDebug.buttons');
    keys = reject(keys, {id : key});

    return ['ensembleDebug.buttons', keys];
  };
}

const keys = ['up', 'down', 'left', 'right', 'start-forward', 'select-back', 'left-stick-button', 'right-stick-button', 'home', 'left-shoulder', 'right-shoulder', 'face-top', 'face-bottom', 'face-left', 'face-right'];

function ActionMap () {
  let actionMap = { nothing: [] };

  each(keys, function eachKey (key) {
    actionMap[key] = [{call: createKeyDownFunc(key), noEventKey: key, whenWaiting: true}];
    actionMap.nothing.push({call: createKeyUpFunc(key), noEventKey: key, whenWaiting: true});
  });

  return actionMap;
}


/*
  TODO: extract into a reuseable lib (show all entries in array as widgets)
  import showArrayOfWidgets({
    array: 'ensembleDebug.buttons',
    partial: 'dashboard/rect-small',
    parent: 'debug/gamepad.jade',
    cssId: makeCssId,
    json: jsonForPartial,
  })
*/
function makeCssId (id) {
  return `button_${id}`;
}

function jsonForPartial (value) {
  return {
    title: value.id,
    value: value.force
  };
}

function OnClientReady (tracker, $) {
  function addKey (id, value, makeCssId) {
    const partial = require('../../../public/partials/dashboard/rect-small.jade');

    var json = {
      id: makeCssId(id)
    };
    json = merge(json, jsonForPartial(value), true);

    $()('#gamepad').append(partial(json));
  }

  function removeKey (id, makeCssId) {
    $()(`#${makeCssId(id)}`).remove();
  }

  return function setupKeyStateDebugView () {
    const parent = require('../../../public/partials/debug/gamepad.jade');

    $()('#debug').append(parent());

    tracker().onElementAdded('ensembleDebug.buttons', addKey, [makeCssId]);
    tracker().onElementRemoved('ensembleDebug.buttons', removeKey, [makeCssId]);
  };
}




module.exports = {
  type: 'DebugKeyState',
  deps: ['Config', 'DefinePlugin'],
  func: function DebugKeyState (config, define) {
    if (!config().debug.gamepad) {
      return;
    }

    define()('StateSeed', StateSeed);
    define()('ActionMap', ActionMap);
    define()('OnClientReady', ['StateTracker', '$'], OnClientReady);
  }
};