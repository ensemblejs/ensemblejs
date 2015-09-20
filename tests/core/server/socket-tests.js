'use strict';

var expect = require('expect');
var sinon = require('sinon');
var _ = require('lodash');
var makeTestible = require('../../support').makeTestible;

//Stub out socket.io
var socket = {
	id: '1',
	on: sinon.spy(),
	emit: sinon.spy(),
	handshake: {
		address: '::1'
	}
};
var io = {
	close: sinon.spy(),
	of: function() {
		return {
			on: function(name, f) {
				f(socket);
			}
		};
	}
};
var gameState = {
	hi: 'there',
};

var StateAccess = {
	for: function() {
		return {
			for: function () {
				return {
					get: function () {
						return false;
					}
				};
			}
		};
	}
};

var server = {};

var pendingAckCallback = sinon.spy();
var modes = ['arcade'];
var logger = {
	socket: sinon.spy()
};

var onInput = sinon.spy();

var fakeOn = require('../../fake/on');
var fakeTime = require('../../fake/time').at(1000);

var sut = makeTestible('core/server/socket-server', {
	AcknowledgementMap: [
		['*', { first: [{target: pendingAckCallback, data: gameState}] }]
	],
	OnInput: [onInput],
	RawStateAccess: {
		for: function() {
			return gameState;
		}
	},
	StateMutator: sinon.spy(),
	StateAccess: StateAccess,
	Logger: logger,
	Config: {
		server: {
			pushUpdateFrequency: 33
		}
	},
	LowestInputProcessed: sinon.spy(),
	On: fakeOn,
	Time: fakeTime
});

var socketServer = sut[0];

describe('the socket server', function () {
	beforeEach(function () {
		var socketIo = require('socket.io');
		socketIo.listen = function() { return io; };

		sinon.spy(io, 'of');
		sinon.spy(global, 'setInterval');

		socket.emit.reset();
		fakeOn.newGame.reset();
		fakeOn.clientConnect.reset();
	});

	afterEach(function () {
		_.each(setInterval.returnValues, function(id) {
			clearInterval(id);
		});

		setInterval.restore();
		io.of.restore();
	});

	describe('setting up the socket', function () {
		beforeEach(function () {
			socketServer.start(server, modes);
		});

		afterEach(function () {
			socketServer.stop();
		});

		it('should listen on /:mode/primary', function () {
			expect(io.of.calledOnce).toEqual(true);
			expect(io.of.firstCall.args).toEqual(['/arcade/primary']);
		});
	});

	describe('setting up the socket with only one mode', function () {
		beforeEach(function () {
			socketServer.start(server, []);
		});

		afterEach(function () {
			socketServer.stop();
		});

		it('should listen on /game/primary', function () {
			expect(io.of.calledOnce).toEqual(true);
			expect(io.of.firstCall.args).toEqual(['/game/primary']);
		});
	});

	describe('on connect', function () {
		var updateClientFunc;

		beforeEach(function () {
			socketServer.start(server, modes);

			updateClientFunc = setInterval.firstCall.args[0];
		});

		afterEach(function () {
			socketServer.stop();
		});

		it('should setup the socket events', function () {
			expect(socket.on.firstCall.args[0]).toEqual('disconnect');
			expect(socket.on.secondCall.args[0]).toEqual('pause');
			expect(socket.on.thirdCall.args[0]).toEqual('unpause');
			expect(socket.on.getCall(3).args[0]).toEqual('error');
			expect(socket.on.getCall(4).args[0]).toEqual('input');
		});

		it('should send the start time to the client', function () {
			expect(socket.emit.firstCall.args).toEqual(['startTime', 1000]);
		});

		it('should send the player id to the client', function () {
			expect(socket.emit.secondCall.args).toEqual(['initialState', gameState]);
		});

		it('should send the initial state to the client', function () {
			expect(socket.emit.thirdCall.args).toEqual(['playerId', { id: 6}]);
			expect(socket.emit.callCount).toEqual(3);
		});

		it('should emit a local new game event', function () {
			expect(fakeOn.newGame.callCount).toEqual(1);
			expect(fakeOn.newGame.firstCall.args).toEqual([{
				id: 7,
				mode: 'arcade'
			}]);
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
				1,
				{
					gameState: {hi: 'there'},
					id: 1,
					highestProcessedMessage: undefined,
					timestamp: 1000
				}
			]);
		});
	});

	describe('the client update loop', function () {
		var updateClientFunc;

		beforeEach(function () {
			socketServer.start(server, modes);

			updateClientFunc = setInterval.firstCall.args[0];
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
			gameState.altered = true;
			updateClientFunc();

			expect(fakeOn.outgoingServerPacket.callCount).toEqual(1);
			expect(fakeOn.outgoingServerPacket.firstCall.args).toEqual([1, {
				gameState: {hi: 'there', altered: true},
				id: 4,
				highestProcessedMessage: undefined,
				timestamp: 1000
			}]);
		});

		it('should give each packet an id', function () {
			fakeOn.outgoingServerPacket.reset();

			updateClientFunc();

			expect(fakeOn.outgoingServerPacket.firstCall.args[1].id).toEqual(5);
		});

		it('should record the sent time of each packet', function () {
			updateClientFunc();

			expect(fakeOn.outgoingServerPacket.firstCall.args[1].timestamp).toEqual(1000);
		});

		it('should send game state based on the configured frequency', function() {
			expect(setInterval.firstCall.args[1]).toEqual(33);
		});
	});

	describe('on disconnect', function () {
		beforeEach(function () {
			expect(socket.on.firstCall.args[0]).toEqual('disconnect');
			socket.on.firstCall.args[1]();
		});

		it('should call the onPause callback', function() {
			expect(fakeOn.clientDisconnect.calledOnce).toEqual(true);
		});
	});

	describe('on pause', function () {
		beforeEach(function () {
			socket.on.secondCall.args[1]();
		});

		it('should call the onPause callback', function() {
			expect(fakeOn.pause.calledOnce).toEqual(true);
		});
	});

	describe('on unpause', function () {
		beforeEach(function () {
			socket.on.thirdCall.args[1]();
		});

		it('should call the onUnpause callback', function () {
			expect(fakeOn.resume.calledOnce).toEqual(true);
		});
	});

	describe('on input', function () {
		var inputData;

		beforeEach(function () {
			inputData = {
				pendingAcks: [{name: 'first', id: 1}]
			};

			pendingAckCallback.reset();

			socket.on.getCall(4).args[1](inputData);
		});

		it('should remove pending acks from the input data', function () {
			expect(inputData.pendingAcks).toEqual(undefined);
		});

		it('should call the OnInput callback', function () {
			expect(onInput.called).toEqual(true);
		});

		it('should call the pendingAck target', function () {
			expect(pendingAckCallback.called).toEqual(true);
		});

		it('should pass the ack into the pendingAck target', function () {
			expect(pendingAckCallback.firstCall.args[1]).toEqual({name: 'first', id: 1});
		});

		it('should pass the data parameter into the pendingAck target', function () {
			expect(pendingAckCallback.firstCall.args[2]).toEqual(gameState);
		});
	});
});