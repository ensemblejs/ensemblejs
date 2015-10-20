'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;

var modes = {
    'test': function() { console.log('this just happened'); }
};
var expressServer = {
	listen: sinon.spy(),
	close: sinon.spy()
};

describe('starting the server', function () {
	var onServerStart;
	var onServerStop;

	beforeEach(function () {
		var http = require('http');
		http.createServer = function() { return expressServer; };

		var sut = makeTestible('core/server/web-server', {
			SocketServer: {
				start: sinon.spy(),
				stop: sinon.spy()
			},
			Config:  {
				debug: {
					develop: false
				},
				logging: {
					logLevel: 'info',
					expressBunyanLogger: {
						excludes: []
					}
				}
			},
			Routes: {
				configure: sinon.spy()
			},
			RequestEventPublisher: {
				middleware: sinon.spy()
			}
		});

		onServerStart = sut[0];
		onServerStop = sut[1].OnServerStop();

		onServerStart('../game', modes);
		onServerStop();
	});

	afterEach(function() {
		onServerStop();
	});

	it('should tell express to listen on port 3000', function () {
		expect(expressServer.listen.firstCall.args[0]).toEqual(3000);
	});
});

describe('stopping the server', function () {
	var onServerStart;
	var onServerStop;

	beforeEach(function() {
		var http = require('http');
		http.createServer = function() { return expressServer; };

		var sut = makeTestible('core/server/web-server', {
			SocketServer: {
				start: sinon.spy(),
				stop: sinon.spy()
			},
			Config:  {
				debug: {
					develop: false
				},
				logging: {
					logLevel: 'info',
					expressBunyanLogger: {
						excludes: []
					}
				}
			},
			Routes: {
				configure: sinon.spy()
			},
			RequestEventPublisher: {
				middleware: sinon.spy()
			}
		});

		onServerStart = sut[0];
		onServerStop = sut[1].OnServerStop();

		onServerStart('../game', modes);
		onServerStop();
	});

	it('it should stop the server', function () {
		expect(expressServer.close.called).toEqual(true);
	});
});