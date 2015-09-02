'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;
var defaults = require('lodash').defaults;
var jsdom = require('jsdom').jsdom;
var defer = require('../../support').defer;
var plugin = require('../../support').plugin();

var savedEvents = {};
var socket = {
	on: function(name, f) {
		savedEvents[name] = savedEvents[name] || [];
		savedEvents[name].push(f);
	},
	emit: sinon.spy()
};
var $;

var io = require('socket.io-client');
io.connect = function () { return socket; };

var GameMode = 'arcade';
var serverUrl = 'http://bananarama:3000';
var pendingAcks = {
	flush: function() { return [1, 2, 3]; }
};
var socketClient;

var on = {
	input: sinon.spy(),
	connect: sinon.spy(),
	disconnect: sinon.spy(),
	setup: sinon.spy(),
	serverPacket: sinon.spy(),
	error: sinon.spy()
};
var onClientPacket;

describe('desktop socket client', function () {
	beforeEach(function (done) {
		var html = '<html><body><div id="element">With content.</div></body></html>';
	  jsdom.env({
	    html: html,
	    done: function(err, window) {
	      global.window = window;
	      global.getComputedStyle = function() {};
	      global.self = {};
	      global.window.document.hasFocus = function () { return false; };

	      $ = require('zepto-browserify').$;

				socketClient = require('../../../src/core/client/socket-client').func(defer(window), defer(GameMode), defer(serverUrl), defer(on), defer(plugin.define));

	      done();
    }});

		sinon.spy(io, 'connect');
		socket.emit.reset();
		savedEvents = {};
	});

	afterEach(function () {
		io.connect.restore();
	});

	it('should connect to /:mode/primary on set serverUrl', function () {
		socketClient.connect();

		expect(io.connect.firstCall.args[0]).toEqual('http://bananarama:3000/arcade/primary');
	});

	it('if the window has focus when we connect; unpause', function () {
		global.window.document.hasFocus = function () { return true; };
		socketClient.connect();

		expect(socket.emit.firstCall.args[0]).toEqual('unpause');
	});

	it('if the window does not have focus when we connect; don\'t send an unpause event', function () {
		global.window.document.hasFocus = function () { return false; };
		socketClient.connect();

		expect(socket.emit.called).toEqual(false);
	});

	it('should send client packets to the server', function () {
		socketClient.connect();

		var packet = {a: 'b'};
		onClientPacket = plugin.deps().OnClientPacket();
		onClientPacket(packet);

		expect(socket.emit.firstCall.args).toEqual(['input', packet]);
	});
});

describe('events', function () {
	beforeEach(function () {
		socket.emit.reset();
	});

	var document = function() {
		return global.window.document;
	};

	var makeFakeEvent = function(klass, type, options) {
		var event = document().createEvent(klass);
		event.initEvent(type, true, true);
    event = defaults(event, options);

    return event;
	};

	describe('when the window loses focus', function() {
		it('should send a pause event', function () {
			document().dispatchEvent(makeFakeEvent('WindowEvent', 'blur'));

			expect(socket.emit.firstCall.args[0]).toEqual('pause');
		});
	});

	describe('when the window gains focus', function() {
		it('should send an unpause event', function () {
			document().dispatchEvent(makeFakeEvent('WindowEvent', 'focus'));

			expect(socket.emit.firstCall.args[0]).toEqual('unpause');
		});
	});

	describe('when the mouse button is pressed', function() {
		it('should send an unpause event', function () {
			document().dispatchEvent(makeFakeEvent('MouseEvent', 'mouseup', {which: 1}));

			expect(socket.emit.firstCall.args[0]).toEqual('unpause');
		});
	});

	describe('when the mouse button is released', function() {
		it('should send an unpause event', function () {
			document().dispatchEvent(makeFakeEvent('MouseEvent', 'mousedown', {which: 1}));

			expect(socket.emit.firstCall.args[0]).toEqual('unpause');
		});
	});

	it('should call the on connect callbacks', function () {
		savedEvents.connect[0]();
		expect(on.connect.called).toBe(true);
	});

	it('should call on disconnect callbacks', function () {
		savedEvents.disconnect[0]();
		expect(on.disconnect.called).toBe(true);
	});

	it('should call on initialState callbacks', function () {
		savedEvents.initialState[0]();
		expect(on.setup.called).toBe(true);
	});

	it('should call on updateState callbacks', function () {
		savedEvents.updateState[0]();
		expect(on.serverPacket.called).toBe(true);
	});

	it('should call on error callbacks', function () {
		savedEvents.error[0]();
		expect(on.error.called).toBe(true);
	});
});

describe.skip('sending input events to the server', function () {
	var emitFunc;
	var packet;
	var clock;

	before(function() {
		clock = sinon.useFakeTimers();
		sinon.spy(io, 'connect');
		sinon.spy(global, 'setInterval');
		socketClient.connect();
		emitFunc = global.setInterval.firstCall.args[0];
	});

	beforeEach(function () {
		socket.emit.reset();
	});

	after(function () {
		each(setInterval.returnValues, function(id) {
			clearInterval(id);
		});

		setInterval.restore();
		clock.restore();
		io.connect.restore();
	});

	it.skip('should add the current input state from each InputMode to the current packet', function () {
		pendingAcks.flush = function() { return [4, 5, 6]; };
		emitFunc();
		packet = socket.emit.firstCall.args[1];

		expect(packet.a).toEqual('a');
		expect(packet.b).toEqual({'c': 'c'});
	});

	it.skip('should not call the emit function if the packet has not changed', function() {
		emitFunc();
		expect(socket.emit.called).toEqual(false);
	});

	it.skip('should add all pending acks to the packet', function () {
		pendingAcks.flush = function() { return [7, 8, 9]; };
		emitFunc();
		packet = socket.emit.firstCall.args[1];

		expect(packet.pendingAcks).toEqual([7,8,9]);
	});

	it.skip('should put the sent timestamp on the packet', function () {
		pendingAcks.flush = function() { return []; };
		emitFunc();
		packet = socket.emit.firstCall.args[1];

		expect(packet.sentTimestamp).toEqual(Date.now());
	});

	it.skip('should send the packet', function () {
		pendingAcks.flush = function() { return [1]; };
		emitFunc();
		packet = socket.emit.firstCall.args[1];

		expect(socket.emit.called).toEqual(true);
		expect(socket.emit.firstCall.args[0]).toEqual('input');
	});
});