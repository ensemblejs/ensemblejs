'use strict';

var expect = require('expect');
var PacketAcks = require('../../../src/core/client/packet-acknowledgements.js').func();

describe('packet acknowledgements', function() {
	it('should allow me to add each packet as it arrives', function() {
		PacketAcks.add('1');

		var acks = PacketAcks.flush();
		expect(acks.length).toBe(1);
		expect(acks[0].id).toBe('1');
	});

	it('should allow me to ack the last packet', function() {
		PacketAcks.add('1');
		PacketAcks.ackLast('ZOMG');

		var acks = PacketAcks.flush();
		expect(acks[0].names).toEqual(['ZOMG']);
	});

	it('should return all packets when flush is called', function() {
		PacketAcks.add('1');
		PacketAcks.add('2');
		PacketAcks.add('3');

		var acks = PacketAcks.flush();
		expect(acks.length).toBe(3);
	});

	it('should remove all unacked packets when flush is called', function() {
		PacketAcks.add('1');
		PacketAcks.add('2');
		PacketAcks.add('3');

		PacketAcks.flush();
		expect(PacketAcks.flush().length).toBe(0);
	});
});