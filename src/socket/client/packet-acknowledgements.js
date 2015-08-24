'use strict';

var clone = require('lodash').clone;

module.exports = {
  type: 'PacketAcknowledgements',
  deps: ['Time'],
  func: function PacketAcknowledgements (time) {
    var acks = [];

    function reset () {
      acks = [];
    }

    function flush () {
      var pending = clone(acks);

      reset();

      return pending;
    }

    function ack (name) {
      acks.push({
        timestamp: time().present(),
        name: name
      });
    }

    return {
      flush: flush,
      ack: ack
    };
  }
};