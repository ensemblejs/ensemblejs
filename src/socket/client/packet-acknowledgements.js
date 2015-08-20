'use strict';

var clone = require('lodash').clone;

module.exports = {
    type: 'PacketAcknowledgements',
    func: function PacketAcknowledgements () {
        var acks = [];

        function reset () {
            acks = [];
        }

        return {
            flush: function flush () {
                var pending = clone(acks);

                reset();

                return pending;
            },
            add: function add (packetId) {
                acks.push({
                    id: packetId,
                    rcvdTimestamp: Date.now(),
                    names: []
                });
            },
            ackLast: function ackLast (name) {
                acks[acks.length - 1].names.push(name);
            }
        };
    }
};