'use strict';

module.exports = {
  type: 'InputQueue',
  func: function InputQueue () {
    var inputQueue = [];

    function set (queue) { inputQueue = queue; }
    function length () { return inputQueue.length; }
    function get (i) { return inputQueue[i]; }
    function clear () { inputQueue = []; }

    return {
      set, length, get, clear
    };
  }
};