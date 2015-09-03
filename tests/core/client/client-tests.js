'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;
var createFakeDom = require('../../fake/dom');

var socket = require('../../fake/socket').socket;
var io = require('../../fake/socket').fake();

var fakeTime = require('../../fake/time').at(1000);
var fakeOn = require('../../fake/on');

var fake$ = require('../../fake/jquery').$;
var fake$wrapper = require('../../fake/jquery').fakeWith(fake$);

describe('the socket client', function () {
	var sut;
	var client;
	var onClientPacket;
	var onServerPacket;

	before(function () {
		sinon.spy(fake$, 'on');
		sinon.spy(io, 'connect');
	});

	beforeEach(function (done) {
		var html = '<html><body><div id="element">With content.</div></body></html>';
	  createFakeDom(html, function (window) {
	  	sut = makeTestible('core/client/socket-client', {
				Window: window,
				GameMode: 'arcade',
				ServerUrl: 'http://ensemblejs.com',
				On: fakeOn,
				Time: fakeTime,
				$: fake$wrapper
			});
			client = sut[0];
	  }, done);

		socket.emit.reset();
		socket.reset();
		fake$.reset();
	});

	after(function () {
		io.connect.restore();
	});

	describe('on connect', function () {
		describe('when the window has focus', function () {

			beforeEach(function () {
				global.window.document.hasFocus = function () { return true; };
				client.connect();
			});

			it('should send unpause event if the window has focus', function () {
				expect(socket.emit.firstCall.args[0]).toEqual('unpause');
				expect(socket.emit.callCount).toEqual(1);
			});
		});

		describe('when the window does not have focus', function () {

			beforeEach(function () {
				global.window.document.hasFocus = function () { return false; };
				client.connect();
			});

			it('should not send an unpause event', function () {
				expect(socket.emit.callCount).toEqual(0);
			});
		});

		it('should connect on the :mode/primary route', function () {
			client.connect();

			expect(io.connect.firstCall.args[0]).toEqual('http://ensemblejs.com/arcade/primary');
		});
	});

	describe('once connected', function () {
		beforeEach(function () {
			client.connect();

			onClientPacket = sut[1].OnClientPacket();
			onServerPacket = sut[1].OnServerPacket();
		});

		describe('on startTime', function () {
			beforeEach(function () {
				socket.savedEvents().startTime[0](3000);
			});

			it('should subtract the client time with the supplied server offset', function () {
				expect(fakeTime.setOffset.firstCall.args).toEqual([2000]);
			});
		});

		describe('on connect', function () {
			beforeEach(function () {
				socket.savedEvents().connect[0]();
			});

			it('should call all OnConnect plugins', function () {
				expect(fakeOn.connect.callCount).toEqual(1);
			});
		});

		describe('on disconnect', function () {
			beforeEach(function () {
				socket.savedEvents().disconnect[0]();
			});

			it('should call all OnDisconnect plugins', function () {
				expect(fakeOn.disconnect.callCount).toEqual(1);
			});
		});

		describe('on playerId', function () {
			beforeEach(function () {
				socket.savedEvents().playerId[0](12);
			});

			it('should set the playerId on the socket', function () {
				expect(socket.playerId).toEqual(12);
			});
		});

		describe('on initialState', function () {
			beforeEach(function () {
				socket.savedEvents().initialState[0]({
					packet: true
				});
			});

			it('should call all OnSetup plugins', function () {
				expect(fakeOn.setup.callCount).toEqual(1);
			});

			it('should pass the packet on', function () {
				expect(fakeOn.setup.firstCall.args[0]).toEqual({
					packet: true
				});
			});

			it('should pass the mode to the router', function () {
				expect(fakeOn.setup.firstCall.args[1]).toEqual('arcade');
			});
		});

		describe('on updateState', function () {
			beforeEach(function () {
				socket.savedEvents().updateState[0]({
					newPacket: true
				});
			});

			it('should call all OnServerPacket plugins', function () {
				expect(fakeOn.serverPacket.callCount).toEqual(1);
				expect(fakeOn.serverPacket.firstCall.args).toEqual([{
					newPacket: true
				}]);
			});
		});

		describe('on error', function () {
			beforeEach(function () {
				socket.savedEvents().error[0]('data');
			});

			it('should call all OnError plugins', function () {
				expect(fakeOn.error.callCount).toEqual(1);
				expect(fakeOn.error.firstCall.args).toEqual(['data']);
			});
		});

		describe('on outgoing client packet', function () {

			beforeEach(function () {
				onClientPacket({
					outgoingPacket: true
				});
			});

			it('should send the packet to the server', function () {
				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual([
					'input',
					{
						outgoingPacket: true
					}
				]);
			});
		});

		describe('on incoming server packet', function () {

			beforeEach(function () {
				onServerPacket({
					id: 50
				});
			});

			it('should send an ack to the server', function () {
				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual([
					'ack', 50
				]);
			});
		});

		describe('when the window has focus', function () {
			beforeEach (function () {
				fake$.savedEvents().blur[0]();
			});

			it('should send a pause event when the focus is lost', function () {
				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual(['pause']);
			});
		});

		describe('when the window does not have focus', function () {
			it('should send a pause event when the focus is gained', function () {
				fake$.savedEvents().focus[0]();

				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual(['unpause']);
			});

			it('should send a pause event when the mouse button is pressed', function () {
				fake$.savedEvents().mousedown[0]();

				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual(['unpause']);
			});

			it('should send a pause event when the mouse button is released', function () {
				fake$.savedEvents().mouseup[0]();

				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual(['unpause']);
			});
		});
	});
});