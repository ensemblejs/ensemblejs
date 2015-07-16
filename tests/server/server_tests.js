'use strict';

var expect = require('expect');
var sinon = require('sinon');

var deferDep = require('../helpers.js').deferDep;
var socketServer = {
	start: sinon.spy(),
	stop: sinon.spy()
};

var modes = {
    'test': function() { console.log('this just happened'); }
};
var expressServer = {
	listen: sinon.spy(),
	close: sinon.spy()
};
var server;
var favicon = sinon.spy();
var config = {
	logging: {
		logLevel: 'info',
		expressBunyanLogger: {
			excludes: []
		}
	}
};

describe('starting the server', function () {
	beforeEach(function () {
		var http = require('http');
		http.createServer = function() { return expressServer; };

		var io = require('socket.io');
		io.listen = sinon.spy();
		io.of = sinon.spy();

		server = require('../../src/server').func(deferDep(socketServer), deferDep(config));
		server.start('../game', modes);
	});

	afterEach(function() {
		server.stop();
	});

	describe.skip('when I decide on a good way to stub out require deps', function () {
		it('should set the asset paths');
		it('should configure jade as the template engine');

		describe('when a favicon is supplied', function () {
			it('should use the supplied favicon', function () {
				expect(favicon.firstCall.args).toEqual([]);
			});
		});

		describe('when a favicon is not supplied', function () {
			it('should use the default favicon');
		});
	});

	it('should tell express to listen on port 3000', function () {
		expect(expressServer.listen.firstCall.args[0]).toEqual(3000);
	});
});

describe('stopping the server', function () {
	beforeEach(function() {
		var http = require('http');
		var io = require('socket.io');
		io.listen = sinon.spy();
		io.of = sinon.spy();
		http.createServer = function() { return expressServer; };

		server = require('../../src/server').func(deferDep(socketServer), deferDep(config));
		server.start('../game', modes);
		server.stop();
	});

	it('it should stop the server', function () {
		expect(expressServer.close.called).toEqual(true);
	});
});