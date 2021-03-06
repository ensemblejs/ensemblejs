'use strict';

const expect = require('expect');
const sinon = require('sinon');
const makeTestible = require('../../support').makeTestible;
const createFakeDom = require('../../fake/dom');

const socket = require('../../fake/socket').socket;
const io = require('../../fake/socket').fake();

const fakeTime = require('../../fake/time').at(1000);
const fakeOn = require('../../fake/on');

const fake$ = require('../../fake/jquery').$;
const fake$wrapper = require('../../fake/jquery').fakeWith(fake$);

import {plugin} from '../../../src/plugins/plug-n-play';

describe('the socket client', function () {
	let sut;
	let client;
	let onOutgoingClientPacket;
	let onIncomingServerPacket;

	before(function () {
		sinon.spy(fake$, 'on');
		sinon.spy(io, 'connect');
		sinon.stub(global, 'setInterval');
	});

	beforeEach(function (done) {
		const html = '<html><body><div id="element">With content.</div></body></html>';
		createFakeDom(html, function (window) {
			sut = makeTestible('core/client/socket-client', {
				Window: window,
				SaveMode: 'arcade',
				ServerUrl: 'http://ensemblejs.com',
				On: fakeOn,
				Time: fakeTime,
				$: fake$wrapper,
				DeviceMode: { name: 'primary', supportedInput: ['keyboard'], canPause: true },
				Config: {
					logging: {
						heartbeatInterval: 30000
					}
				}
			});
			client = sut[0];
		}, done);

		socket.emit.reset();
		socket.reset();
		fake$.reset();
	});

	after(function () {
		fake$.on.restore();
		io.connect.restore();
		global.setInterval.restore();
	});

	describe('on connect', function () {
		describe('when the window does not have focus', function () {
			beforeEach(function () {
				socket.emit.reset();
				global.window.document.hasFocus = function () { return false; };
				client.connect();
			});

			it('should not send an unpause event', function () {
				expect(socket.emit.callCount).toEqual(1);
			});
		});

		it('should connect on the :mode/primary route', function () {
			client.connect();

			expect(io.connect.firstCall.args[0]).toEqual('http://ensemblejs.com/arcade/primary');
		});

		it('should send saveId', function () {
			client.connect();

			expect(socket.emit.firstCall.args[0]).toEqual('saveId');
			expect(socket.emit.callCount).toEqual(1);
		});
	});

	describe('once connected', function () {
		beforeEach(function () {
			client.connect();

			onOutgoingClientPacket = plugin('OnOutgoingClientPacket');
			onIncomingServerPacket = plugin('OnIncomingServerPacket');
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

		describe('on playerNumber', function () {
			beforeEach(function () {
				socket.savedEvents().playerNumber[0](12);
			});

			it('should call the clientPlayerId callback', function () {
				expect(fakeOn.clientPlayerId.callCount).toEqual(1);
				expect(fakeOn.clientPlayerId.firstCall.args).toEqual([12]);
			});
		});

		describe('on initialState', function () {
			beforeEach(function () {
				socket.savedEvents().initialState[0]({
					packet: true
				});
			});

			it('should call all OnSetup plugins', function () {
				expect(fakeOn.seedInitialState.callCount).toEqual(1);
			});

			it('should pass the packet on', function () {
				expect(fakeOn.seedInitialState.firstCall.args[0]).toEqual({
					packet: true
				});
			});

			it('should pass the mode to the router', function () {
				expect(fakeOn.seedInitialState.firstCall.args[1]).toEqual('arcade');
			});
		});

		describe('on updateState', function () {
			beforeEach(function () {
				socket.savedEvents().updateState[0]({
					newPacket: true
				});
			});

			it('should call all OnIncomingServerPacket plugins', function () {
				expect(fakeOn.incomingServerPacket.callCount).toEqual(1);
				expect(fakeOn.incomingServerPacket.firstCall.args).toEqual([{
					newPacket: true
				}]);
			});
		});

		describe('on error', function () {
			beforeEach(function () {
				fakeOn.error.reset();
				socket.savedEvents().error[0]('data');
			});

			it('should call all OnError plugins', function () {
				expect(fakeOn.error.callCount).toEqual(1);
				expect(fakeOn.error.firstCall.args).toEqual(['data']);
			});
		});

		describe('on outgoing client packet', function () {
			beforeEach(function () {
				socket.emit.reset();

				onOutgoingClientPacket({ outgoingPacket: true });
			});

			it('should send the packet to the server', function () {
				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.lastCall.args).toEqual([
					'input',
					{
						outgoingPacket: true
					}
				]);
			});
		});

		describe('on incoming server packet', function () {
			beforeEach(function () {
				socket.emit.reset();
				onIncomingServerPacket({ id: 50 });
			});

			it('should send an ack to the server', function () {
				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.lastCall.args).toEqual([
					'ack', 50
				]);
			});
		});

		describe('when the window has focus', function () {
			beforeEach (function () {
				socket.emit.reset();
				fake$.savedEvents().blur[0]();
			});

			it('should send a pause event when the focus is lost', function () {
				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual(['pause']);
			});
		});

		describe('when the window does not have focus', function () {
			beforeEach(function () {
				socket.emit.reset();
			});

			it('should send an unpause event when the mouse button is pressed', function () {
				fake$.savedEvents().mousedown[0]();

				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual(['unpause']);
			});

			it('should send an unpause event when a key pressed', function () {
				fake$.savedEvents().keydown[0]();

				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual(['unpause']);
			});

			it('should send an unpause event when the screen is tapped', function () {
				fake$.savedEvents().touchstart[0]();

				expect(socket.emit.callCount).toEqual(1);
				expect(socket.emit.firstCall.args).toEqual(['unpause']);
			});
		});
	});
});