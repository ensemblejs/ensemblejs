'use strict';

var sinon = require('sinon');
var expect = require('expect');
var jsdom = require('jsdom').jsdom;

describe('effects', function () {
	var DisplayBehaviour;
	var Dimensions = {
		get: function() {}
	};
	var part1 = sinon.spy();
	var part2 = sinon.spy();
	var levelParts = [part1, part2];
	var pendingAcknowledgements = {
		ackLast: sinon.spy(),
		add: sinon.spy()
	};
	var registerEffect;
	var definePlugin = function(name, func) {
		registerEffect = func().register;
	};

	var tracker = {
		get: sinon.spy(),
		updateState: sinon.spy()
	};

	var behaviour;

	var defer = function(dep) {
		return function() {
			return dep;
		};
	};

	before(function(done) {
		jsdom.env({
			html: '<div id="a-div">With content.</div>',
			done: function(err, window) {
				global.window = window;
				global.document = window.document;
				global.getComputedStyle = function() {};

				done();
			}});
	});

	beforeEach(function() {
		pendingAcknowledgements.ackLast.reset();
		pendingAcknowledgements.add.reset();
		part1.reset();
		part2.reset();

		DisplayBehaviour = require('../../src/ui/display').func(defer(Dimensions), defer(levelParts), defer(tracker), defer(pendingAcknowledgements), defer(definePlugin));
		behaviour = DisplayBehaviour.Display();
	});

	describe.skip('on a setup packet', function() {
		beforeEach(function () {
			tracker.updateState.reset();
			behaviour.setup();
		});

		it('should tell the state tracker of the new state', function () {
			expect(tracker.updateState.called).toEqual(true);
		});

		it('should call setup on each level part', function () {
			expect(part1.called).toEqual(true);
			expect(part2.called).toEqual(true);
		});
	});

	describe.skip('on an update packet', function () {
		var packet;

		beforeEach(function () {
			packet = {};
			tracker.updateState.reset();
		});

		it('should do nothing if the packet is old', function () {
			packet.id = -1;
			behaviour.update(packet);

			expect(tracker.updateState.called).toEqual(false);
		});

		it('should tell the state tracker of the new packet', function () {
			packet.id = 1;
			behaviour.update(packet);

			expect(tracker.updateState.called).toEqual(true);
		});
	});
});