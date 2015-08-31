'use strict';

var each = require('lodash').each;
var include = require('lodash').include;

module.exports = {
  type: 'InputCapture',
  deps: ['Window', 'DefinePlugin'],
  func: function InputCapture (window, define) {
    var $ = require('zepto-browserify').$;

    var keys = {};
    var singlePressKeys = {};

    var reverseMap = {
      'F1': 'f1',
      'F2': 'f2',
      'F3': 'f3',
      'F4': 'f4',
      'F5': 'f5',
      'F6': 'f6',
      'F7': 'f7',
      'F8': 'f8',
      'F9': 'f9',
      'F10': 'f10',
      'F11': 'f11',
      'F12': 'f12'
    };

    var preventDefault = ['delete', 'f8', 'tab'];

    function keyMap () {
      var map = {
        '8': 'delete',
        '9': 'tab',
        '13': 'enter',
        '20': 'caps',
        '27': 'escape',
        '32': 'space',
        '37': 'left',
        '38': 'up',
        '39': 'right',
        '40': 'down',
        '96': 'escape',
        '186': ';',
        '187': '=',
        '188': ',',
        '189': '-',
        '190': '.',
        '191': '/',
        '192': '`',
        '219': '[',
        '220': '\\',
        '221': ']',
        '222': '\'',
        '63236': 'f1',
        '63237': 'f2',
        '63238': 'f3',
        '63239': 'f4',
        '63240': 'f5',
        '63241': 'f6',
        '63242': 'f7',
        '63243': 'f8',
        '63244': 'f9',
        '63245': 'f10',
        '63246': 'f11',
        '63247': 'f12'
      };
      var i = 0;

      for (i = 48; i <= 111; i += 1) {
        if (i > 57 && i < 65) { continue; }
        if (i > 90 && i < 97) { continue; }
        if (map[i] !== undefined) {
          continue;
        }
        map[i] = String.fromCharCode(i);
      }

      return map;
    }

    function singlePress (key, alt, ctrl, shift) {
      singlePressKeys[key] = [];

      if (alt) { singlePressKeys[key].push('alt'); }
      if (ctrl) { singlePressKeys[key].push('ctrl'); }
      if (shift) { singlePressKeys[key].push('shift'); }
    }

    function press (key, alt, ctrl, shift) {
      keys[key] = [];

      if (alt) { keys[key].push('alt'); }
      if (ctrl) { keys[key].push('ctrl'); }
      if (shift) { keys[key].push('shift'); }
    }

    function release (key) {
      keys[key] = false;
    }

    var ignore = ['Control', 'Shift', 'Alt', 'Meta'];

    function bindToWindowEvents () {
      var singlePressState = {};
      var releasedByBlur = {};

      $(window()).on('blur', function fireReleaseEventForPressedKeys () {
        each(singlePressState, function(value, key) {
          if (!value) {
            return;
          }

          releasedByBlur[key] = true;
          singlePressState[key] = false;
          release(key);
        });
      });

      function resolveKey (e) {
        var key = keyMap()[e.which];
        return key ? key : reverseMap[e.keyIdentifier];
      }

      $(window().document).keydown(function keydown (e) {
        if (include(ignore, e.keyIdentifier)) { return; }

        var key = resolveKey(e);
        press(key, e.altKey, e.ctrlKey, e.shiftKey);

        if (!singlePressState[key]) {
          singlePressState[key] = true;
          singlePress(key, e.altKey, e.ctrlKey, e.shiftKey);
        }

        if (include(preventDefault, key)) {
          e.preventDefault();
        }
      });

      $(window().document).keyup(function keyup (e) {
        if (include(ignore, e.keyIdentifier)) { return; }

        var key = resolveKey(e);
        if (!releasedByBlur[key]) {
          release(key);
        }
        singlePressState[key] = false;
        releasedByBlur[key] = false;
      });
    }

    define()('OnSetup', function () {
      return function KeyboardInputCapture () {
        bindToWindowEvents();
      };
    });

    return function getCurrentState () {
      var inputData = {};

      var keysToSend = [];
      each(keys, function (value, key) {
        if (value) {
          keysToSend.push({key: key, modifiers: value});
        }
      });
      inputData.keys = keysToSend;

      var singlePressKeysToSend = [];
      each(singlePressKeys, function (value, key) {
        if (value) {
          singlePressKeysToSend.push({key: key, modifiers: value});
        }
        singlePressKeys[key] = false;
      });
      inputData.singlePressKeys = singlePressKeysToSend;

      return inputData;
    };
  }
};