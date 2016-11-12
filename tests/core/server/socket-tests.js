'use strict';

const expect = require('expect');
const sinon = require('sinon');
const makeTestible = require('../../support').makeTestible;
const config = require('../../../src/util/config');

//Stub out socket.io
const socket = {
	id: '1',
	on: sinon.spy(),
	emit: sinon.spy(),
	handshake: {
		address: '::1'
	},
	request: {
		sessionID: '1000'
	}
};
const routeSocket = {};
const io = {
	use: sinon.spy(),
	close: sinon.spy(),
	of: (route) => ({
		on: (name, f) => {
			routeSocket[route] = f;
		}
	})
};
const saveState = {
	hi: 'there'
};

const server = {};
const session = sinon.spy();

const gameModes = ['arcade'];
const deviceModes = [ { name: 'primary' }]
const logger = require('../../fake/logger');
const fakeOn = require('../../fake/on');
const fakeTime = require('../../fake/time').at(1000);

const sequence = require('distributedlife-sequence');

const sut = makeTestible('core/server/socket-server', {
	RawStateAccess: {
		for: () => saveState
	},
	Logger: logger,
	On: fakeOn,
	Time: fakeTime,
	SavesList: {
		get: () => ({ id: 8, mode: 'arcade'})
	}
});

const socketServer = sut[0];

describe('the socket server', function () {
	beforeEach(function () {
		const socketIo = require('socket.io');
		socketIo.listen = function() { return io; };

		sinon.spy(io, 'of');
		sinon.stub(config, 'get').returns({
			server: {
				pushUpdateFrequency: 33
			},
			logging: {
				heartbeatInterval: 30000
			}
		});

		socket.emit.reset();
		fakeOn.newSave.reset();
		fakeOn.clientConnect.reset();

		sinon.stub(sequence, 'next').returns(111);
	});

	afterEach(function () {
		sequence.next.restore();

		config.get.restore();
		io.of.restore();
	});

	describe('setting up the socket', function () {
		beforeEach(function beforeEach () {
			socketServer.start(server, gameModes, deviceModes, session);
		});

		afterEach(function afterEach () {
			socketServer.stop();
		});

		it('should listen on /:mode/:deviceMode', function () {
			expect(io.of.callCount).toEqual(1);
			expect(io.of.firstCall.args).toEqual(['/arcade/primary']);
		});
	});

	describe('a primary client', function () {
		describe('on connect', function () {

			beforeEach(function (done) {
				socket.on.reset();

				socketServer.start(server, gameModes, deviceModes, session);

				routeSocket['/arcade/primary'](socket);

				expect(socket.on.firstCall.args[0]).toEqual('saveId');
				socket.on.firstCall.args[1]().then(() => done());
			});

			afterEach(function () {
				socketServer.stop();
			});

			it('should setup the socket events', function () {
				expect(socket.on.getCall(0).args[0]).toEqual('saveId');
				expect(socket.on.getCall(1).args[0]).toEqual('disconnect');
				expect(socket.on.getCall(2).args[0]).toEqual('disconnect');
				expect(socket.on.getCall(3).args[0]).toEqual('pause');
				expect(socket.on.getCall(4).args[0]).toEqual('unpause');
				expect(socket.on.getCall(5).args[0]).toEqual('error');
				expect(socket.on.getCall(6).args[0]).toEqual('input');
			});

			it('should send the start time to the client', function () {
				expect(socket.emit.firstCall.args).toEqual(['startTime', 1000]);
			});

			it('should emit a local client connect event', function () {
				expect(fakeOn.clientConnect.callCount).toEqual(1);
				expect(fakeOn.clientConnect.firstCall.args).toEqual([{
					id: 8,
					mode: 'arcade'
				}, socket]);
			});
		});

		describe('after connect', function () {
			beforeEach(function () {
				socket.on.reset();

				socketServer.start(server, gameModes, deviceModes, session);

				routeSocket['/arcade/primary'](socket);

				expect(socket.on.firstCall.args[0]).toEqual('saveId');
				socket.on.firstCall.args[1]();
			});

			afterEach(function () {
				socketServer.stop();
			});

			describe('on disconnect', function () {
				beforeEach(function () {
					fakeOn.pause.reset();

					expect(socket.on.getCall(1).args[0]).toEqual('disconnect');
					expect(socket.on.getCall(2).args[0]).toEqual('disconnect');
					socket.on.getCall(1).args[1]();
					socket.on.getCall(2).args[1]();
				});

				it('should call the clientDisconnect callback', function() {
					expect(fakeOn.clientDisconnect.calledOnce).toEqual(true);
				});

				it('should call the onPause callback', function() {
					expect(fakeOn.pause.calledOnce).toEqual(true);
				});
			});

			describe('on pause', function () {
				beforeEach(function () {
					fakeOn.pause.reset();

					expect(socket.on.getCall(3).args[0]).toEqual('pause');
					socket.on.getCall(3).args[1]();
				});

				it('should call the onPause callback', function() {
					expect(fakeOn.pause.calledOnce).toEqual(true);
				});
			});

			describe('on unpause', function () {
				beforeEach(function () {
					expect(socket.on.getCall(4).args[0]).toEqual('unpause');
					socket.on.getCall(4).args[1]();
				});

				it('should call the onUnpause callback', function () {
					expect(fakeOn.resume.calledOnce).toEqual(true);
				});
			});

			describe('on error', function () {
				beforeEach(function () {
					fakeOn.error.reset();
					expect(socket.on.getCall(5).args[0]).toEqual('error');
					socket.on.getCall(5).args[1]();
				});

				it('should call the error callback', function () {
					expect(fakeOn.error.callCount).toEqual(1);
				});
			});

			describe('on input', function () {
				beforeEach(function () {
					expect(socket.on.getCall(6).args[0]).toEqual('input');
					socket.on.getCall(6).args[1]({});
				});

				it('should call the onIncomingClientInputPacket callback', function () {
					expect(fakeOn.incomingClientInputPacket.calledOnce).toEqual(true);
				});
			});
		});
	});
});