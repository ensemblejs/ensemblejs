'use strict';

var select = require('lodash').select;
var pluck = require('lodash').pluck;
var reduce = require('lodash').reduce;
var map = require('lodash').map;

module.exports = {
  type: 'ServerSideUpdate',
  deps: ['InternalState'],
  func: function PollQueueDepth (internalState) {
    function update () {
      var onInput = map(select(internalState(), 'OnInput'), function (obj) {
        return obj.OnInput;
      });

      var depth = pluck(onInput, 'queueLength');

      var combinedQueueDepth = reduce(depth, function(total, queueLength) {
        return total + queueLength();
      }, 0);

      return {
        ensembleDebug: {
          inputQueueDepth: combinedQueueDepth
        }
      };
    }

    return update;
  }
};