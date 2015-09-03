'use strict';

var expect = require('expect');
var makeTestible = require('../../support').makeTestible;
var fakeTime = require('../../fake/time').at(1000);
var sut = makeTestible('core/client/packet-acknowledgements', {
	Time: fakeTime
});

var PacketAcks = sut[0];

describe('packet acknowledgements', function() {
	it('should allow me to ack', function() {
		PacketAcks.ack('1');

		var acks = PacketAcks.flush();
		expect(acks.length).toBe(1);
		expect(acks[0].name).toBe('1');
	});

	it('should return all acks when flush is called', function() {
		PacketAcks.ack('1');
		PacketAcks.ack('2');
		PacketAcks.ack('3');

		var acks = PacketAcks.flush();
		expect(acks.length).toBe(3);
	});

	it('should remove all acks when flush is called', function() {
		PacketAcks.ack('1');
		PacketAcks.ack('2');
		PacketAcks.ack('3');

		PacketAcks.flush();
		expect(PacketAcks.flush().length).toBe(0);
	});
});