'use strict';

var expect = require('expect');
var makeTestible = require('../../support').makeTestible;
var fakeTime = require('../../fake/time').at(1000);
var sut = makeTestible('core/client/client-acknowledgements', {
	Time: fakeTime
});

var ClientAcknowledgements = sut[0];

describe('client acknowledgements', function() {
	it('should allow me to ack', function() {
		ClientAcknowledgements.ack('1');

		var acks = ClientAcknowledgements.flush();
		expect(acks.length).toBe(1);
		expect(acks[0].name).toBe('1');
	});

	it('should return all acks when flush is called', function() {
		ClientAcknowledgements.ack('1');
		ClientAcknowledgements.ack('2');
		ClientAcknowledgements.ack('3');

		var acks = ClientAcknowledgements.flush();
		expect(acks.length).toBe(3);
	});

	it('should remove all acks when flush is called', function() {
		ClientAcknowledgements.ack('1');
		ClientAcknowledgements.ack('2');
		ClientAcknowledgements.ack('3');

		ClientAcknowledgements.flush();
		expect(ClientAcknowledgements.flush().length).toBe(0);
	});
});