'use strict';

const merge = require('lodash/merge');
const round = require('round-precision');

function StateSeed () {
  return {
    ensembleDebug: {
      buttons: [],
      'left-trigger': 0,
      'right-trigger': 0,
      'left-stick': {x: 0, y: 0},
      'right-stick': {x: 0, y: 0}
    }
  };
}

function createKeyDownFunc (key) {
  return function (state) {
    const keys = state.get('ensembleDebug.buttons');

    if (keys.filter((k) => k.id === key).length > 0) {
      return {};
    }

    keys.push({id: key});

    return ['ensembleDebug.buttons', keys];
  };
}

function createKeyUpFunc (key) {
  return function (state) {
    let keys = state.get('ensembleDebug.buttons');
    keys = keys.filter((k) => k.id !== key);

    return ['ensembleDebug.buttons', keys];
  };
}

const setForceLeft = (state, force = 0) => ['ensembleDebug.left-trigger', force];
const zeroForceLeft = () => ['ensembleDebug.left-trigger', 0];
const setForceRight = (state, force = 0) => ['ensembleDebug.right-trigger', force];
const zeroForceRight = () => ['ensembleDebug.right-trigger', 0];
const setLeftStick = (state, x, y) => ['ensembleDebug.left-stick', {x, y}];
const setRightStick = (state, x, y) => ['ensembleDebug.right-stick', {x, y}];
const zeroLeftStick = () => ['ensembleDebug.left-stick', {x: 0, y: 0}];
const zeroRightStick = () => ['ensembleDebug.right-stick', {x: 0, y: 0}];

const keys = [
  'up', 'down', 'left', 'right', 'start-forward', 'select-back', 'left-stick-button',
  'right-stick-button', 'home', 'left-shoulder', 'right-shoulder', 'face-top', 'face-bottom',
  'face-left', 'face-right'
];

function ActionMap () {
  const actionMap = { nothing: [] };

  keys.forEach(function eachKey (key) {
    actionMap[key] = [{call: createKeyDownFunc(key), noEventKey: key, whenWaiting: true}];
    actionMap.nothing.push({call: createKeyUpFunc(key), noEventKey: key, whenWaiting: true});
  });

  actionMap['left-trigger'] = [{
    call: setForceLeft, whenWaiting: true, noEventKey: 'left-trigger'
  }];
  actionMap.nothing.push({
    call: zeroForceLeft, noEventKey: 'left-trigger', whenWaiting: true
  });

  actionMap['right-trigger'] = [{
    call: setForceRight, whenWaiting: true, noEventKey: 'right-trigger'
  }];
  actionMap.nothing.push({
    call: zeroForceRight, noEventKey: 'right-trigger', whenWaiting: true
  });

  actionMap['left-stick'] = [{
    call: setLeftStick, whenWaiting: true, noEventKey: 'left-stick'
  }];
  actionMap.nothing.push({
    call: zeroLeftStick, whenWaiting: true, noEventKey: 'left-stick'
  });

  actionMap['right-stick'] = [{
    call: setRightStick, whenWaiting: true, noEventKey: 'right-stick'
  }];
  actionMap.nothing.push({
    call: zeroRightStick, whenWaiting: true, noEventKey: 'right-stick'
  });

  return actionMap;
}


/*
  TODO: extract into a reuseable lib (show all entries in array as widgets)
  import showArrayOfWidgets({
    array: 'ensembleDebug.buttons',
    partial: 'dashboard/rect-small',
    parent: 'debug/gamepad.pug',
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
    const partial = require('../../../public/partials/dashboard/rect-small.pug');

    let json = { id: makeCssId(id) };
    json = merge(json, jsonForPartial(value), true);

    $()('#gamepad').append(partial(json));
  }

  function removeKey (id, priorValue, makeCssId) {
    $()(`#${makeCssId(id)}`).remove();
  }

  function setLeftTriggerForce (current) {
    $()('#left-trigger-force .value').text(round(current, 2));
  }

  function setRightTriggerForce (current) {
    $()('#right-trigger-force .value').text(round(current, 2));
  }

  function setLeftStick (current) {
    $()('#left-stick .value').text(
      `${round(current.x, 2)}, ${round(current.y, 2)}`
    );
  }

  function setRightStick (current) {
    $()('#right-stick .value').text(
      `${round(current.x, 2)}, ${round(current.y, 2)}`
    );
  }

  return function setupKeyStateDebugView () {
    const parent = require('../../../public/partials/debug/gamepad.pug');

    $()('#debug').append(parent());

    tracker().onElementAdded('ensembleDebug.buttons', addKey, [makeCssId]);
    tracker().onElementRemoved('ensembleDebug.buttons', removeKey, [makeCssId]);

    const partial = require('../../../public/partials/dashboard/rect-small.pug');

    const leftTrigger = {
      id: 'left-trigger-force',
      title: 'Left Trigger',
      value: 0
    };
    const rightTrigger = {
      id: 'right-trigger-force',
      title: 'Right Trigger',
      value: 0
    };
    const leftStick = {
      id: 'left-stick',
      title: 'Left Stick',
      value: '0, 0'
    };
    const rightStick = {
      id: 'right-stick',
      title: 'Right Stick',
      value: '0, 0'
    };

    $()('#gamepad').append(partial(leftTrigger));
    $()('#gamepad').append(partial(rightTrigger));
    $()('#gamepad').append(partial(leftStick));
    $()('#gamepad').append(partial(rightStick));

    tracker().onChangeOf('ensembleDebug.left-trigger', setLeftTriggerForce);
    tracker().onChangeOf('ensembleDebug.right-trigger', setRightTriggerForce);
    tracker().onChangeOf('ensembleDebug.left-stick', setLeftStick);
    tracker().onChangeOf('ensembleDebug.right-stick', setRightStick);
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