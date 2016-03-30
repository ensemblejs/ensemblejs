'use strict';

var expect = require('expect');
var sinon = require('sinon');
var _ = require('lodash');
var makeTestible = require('../../support').makeTestible;
var config = require('../../../src/util/config');

//Stub out socket.io
var socket = {
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
var routeSocket = {};
var io = {
	use: sinon.spy(),
	close: sinon.spy(),
	of: function(route) {
		return {
			on: function(name, f) {
				routeSocket[route] = f;
			}
		};
	}
};
var saveState = {
	hi: 'there',
};

var server = {};
var session = sinon.spy();

var modes = ['arcade'];
var logger = require('../../fake/logger');
var fakeOn = require('../../fake/on');
var fakeTime = require('../../fake/time').at(1000);

var sequence = require('distributedlife-sequence');

var sut = makeTestible('core/server/socket-server', {
	RawStateAccess: {
		for: function() {
			return saveState;
		}
	},
	Logger: logger,
	LowestInputProcessed: sinon.spy(),
	On: fakeOn,
	Time: fakeTime,
	SavesList: {
		get: function () { return { id: 8, mode: 'arcade'}; }
	}
});

var socketServer = sut[0];

describe('the socket server', function () {
	beforeEach(function () {
		var socketIo = require('socket.io');
		socketIo.listen = function() { return io; };

		sinon.spy(io, 'of');
		sinon.spy(global, 'setInterval');
		sinon.stub(config, 'get').returns({
			server: {
				pushUpdateFrequency: 33
			}
		});

		socket.emit.reset();
		fakeOn.newSave.reset();
		fakeOn.clientConnect.reset();

		sinon.stub(sequence, 'next').returns(111);
	});

	afterEach(function () {
		_.each(setInterval.returnValues, function(id) {
			clearInterval(id);
		});

		sequence.next.restore();

		config.get.restore();
		setInterval.restore();
		io.of.restore();
	});

	describe('setting up the socket', function () {
		beforeEach(function beforeEach () {
			socketServer.start(server, modes, session);
		});

		afterEach(function afterEach () {
			socketServer.stop();
		});

		it('should listen on /:mode/primary', function () {
			expect(io.of.callCount).toEqual(4);
			expect(io.of.firstCall.args).toEqual(['/arcade/primary']);
		});

		it('should listen on /:mode/observer', function () {
			expect(io.of.secondCall.args).toEqual(['/arcade/observer']);
		});

		it('should listen on /:mode/gamepad', function () {
			expect(io.of.thirdCall.args).toEqual(['/arcade/gamepad']);
		});

		it('should listen on /:mode/mobile', function () {
			expect(io.of.lastCall.args).toEqual(['/arcade/mobile']);
		});
	});

	describe('a primary client', function () {
		describe('on connect', function () {
			var updateClientFunc;

			beforeEach(function (done) {
				socket.on.reset();

				socketServer.start(server, modes, session);

				routeSocket['/arcade/primary'](socket);

				expect(socket.on.firstCall.args[0]).toEqual('saveId');
				socket.on.firstCall.args[1]().then(() => {
					updateClientFunc = setInterval.firstCall.args[0];
					done();
				});
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

			it('should send the initial state to the client', function () {
				expect(socket.emit.secondCall.args).toEqual(['initialState', saveState]);
			});

			it('should emit a local client connect event', function () {
				expect(fakeOn.clientConnect.callCount).toEqual(1);
				expect(fakeOn.clientConnect.firstCall.args).toEqual([{
					id: 8,
					mode: 'arcade'
				}, socket]);
			});

			it('should start the update loop', function () {
				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.firstCall.args).toEqual([
					'1',
					{
						saveState: {hi: 'there'},
						id: 111,
						highestProcessedMessage: undefined,
						timestamp: 1000
					}
				]);
			});
		});

		describe('the client update loop', function () {
			var updateClientFunc;

			beforeEach(function (done) {
				socketServer.start(server, modes, session);

				routeSocket['/arcade/primary'](socket);

				expect(socket.on.firstCall.args[0]).toEqual('saveId');
				socket.on.firstCall.args[1]().then(() => {
					updateClientFunc = setInterval.firstCall.args[0];
					done();
				});
			});

			afterEach(function () {
				socketServer.stop();
			});

			it('should not send the packet if the game state hasn\'t changed', function () {
				updateClientFunc();

				fakeOn.outgoingServerPacket.reset();
				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.callCount).toEqual(0);
			});

			it('should send the packet if the game state has changed', function () {
				updateClientFunc();

				fakeOn.outgoingServerPacket.reset();
				saveState.altered = true;
				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.callCount).toEqual(1);
				expect(fakeOn.outgoingServerPacket.firstCall.args).toEqual(['1', {
					saveState: {hi: 'there', altered: true},
					id: 111,
					highestProcessedMessage: undefined,
					timestamp: 1000
				}]);
			});

			it('should give each packet an id', function () {
				fakeOn.outgoingServerPacket.reset();

				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.firstCall.args[1].id).toEqual(111);
			});

			it('should record the sent time of each packet', function () {
				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.firstCall.args[1].timestamp).toEqual(1000);
			});

			it('should send game state based on the configured frequency', function() {
				expect(setInterval.firstCall.args[1]).toEqual(33);
			});
		});

		describe('after connect', function () {
			beforeEach(function () {
				socket.on.reset();

				socketServer.start(server, modes, session);

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

	describe('an observer client', function () {
		describe('on connect', function () {
			var updateClientFunc;

			beforeEach(function (done) {
				saveState = { hi: 'there' };

				setInterval.reset();
				socket.on.reset();
				fakeOn.outgoingServerPacket.reset();

				socketServer.start(server, modes, session);

				routeSocket['/arcade/observer'](socket);

				expect(socket.on.firstCall.args[0]).toEqual('saveId');
				socket.on.firstCall.args[1]().then(() => {
					updateClientFunc = setInterval.firstCall.args[0];
					done();
				});
			});

			afterEach(function () {
				socketServer.stop();
			});

			it('should setup the socket events', function () {
				expect(socket.on.getCall(0).args[0]).toEqual('saveId');
				expect(socket.on.getCall(1).args[0]).toEqual('disconnect');
				expect(socket.on.getCall(2).args[0]).toEqual('error');
			});

			it('should send the start time to the client', function () {
				expect(socket.emit.firstCall.args).toEqual(['startTime', 1000]);
			});

			it('should send the initial state to the client', function () {
				expect(socket.emit.secondCall.args).toEqual(['initialState', saveState]);
			});

			it('should emit a local client connect event', function () {
				expect(fakeOn.clientConnect.callCount).toEqual(1);
				expect(fakeOn.clientConnect.firstCall.args).toEqual([{
					id: 8,
					mode: 'arcade'
				}, socket]);
			});

			it('should start the update loop', function () {
				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.firstCall.args).toEqual([
					'1',
					{
						saveState: {hi: 'there'},
						id: 111,
						highestProcessedMessage: undefined,
						timestamp: 1000
					}
				]);
			});
		});

		describe('the client update loop', function () {
			var updateClientFunc;

			beforeEach(function (done) {
				saveState = { hi: 'there' };

				setInterval.reset();
				fakeOn.outgoingServerPacket.reset();

				socketServer.start(server, modes, session);

				routeSocket['/arcade/observer'](socket);

				expect(socket.on.firstCall.args[0]).toEqual('saveId');
				socket.on.firstCall.args[1]().then(() => {
					updateClientFunc = setInterval.firstCall.args[0];
					done();
				});
			});

			afterEach(function () {
				socketServer.stop();
			});

			it('should not send the packet if the game state hasn\'t changed', function () {
				updateClientFunc();

				fakeOn.outgoingServerPacket.reset();
				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.callCount).toEqual(0);
			});

			it('should send the packet if the game state has changed', function () {
				updateClientFunc();

				fakeOn.outgoingServerPacket.reset();
				saveState.altered = true;
				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.callCount).toEqual(1);
				expect(fakeOn.outgoingServerPacket.firstCall.args).toEqual(['1', {
					saveState: {hi: 'there', altered: true},
					id: 111,
					highestProcessedMessage: undefined,
					timestamp: 1000
				}]);
			});

			it('should give each packet an id', function () {
				fakeOn.outgoingServerPacket.reset();

				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.firstCall.args[1].id).toEqual(111);
			});

			it('should record the sent time of each packet', function () {
				updateClientFunc();

				expect(fakeOn.outgoingServerPacket.firstCall.args[1].timestamp).toEqual(1000);
			});

			it('should send game state based on the configured frequency', function() {
				expect(setInterval.firstCall.args[1]).toEqual(33);
			});
		});

		describe('after connect', function () {
			beforeEach(function () {
				socket.on.reset();

				socketServer.start(server, modes, session);

				routeSocket['/arcade/observer'](socket);

				expect(socket.on.firstCall.args[0]).toEqual('saveId');
				socket.on.firstCall.args[1]();
			});

			afterEach(function () {
				socketServer.stop();
			});

			describe('on disconnect', function () {
				beforeEach(function () {
					fakeOn.pause.reset();
					fakeOn.clientDisconnect.reset();

					expect(socket.on.secondCall.args[0]).toEqual('disconnect');
					socket.on.secondCall.args[1]();
				});

				it('should call the clientDisconnect callback', function() {
					expect(fakeOn.clientDisconnect.calledOnce).toEqual(true);
				});
			});

			describe('on error', function () {
				beforeEach(function () {
					fakeOn.error.reset();
					expect(socket.on.thirdCall.args[0]).toEqual('error');
					socket.on.thirdCall.args[1]();
				});

				it('should call the error callback', function () {
					expect(fakeOn.error.callCount).toEqual(1);
				});
			});
		});
	});
});