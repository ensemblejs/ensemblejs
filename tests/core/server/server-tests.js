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
var favicon = sinon.spy();

describe('starting the server', function () {
	var onStart;
	var onStop;

	beforeEach(function () {
		var http = require('http');
		http.createServer = function() { return expressServer; };

		var sut = makeTestible('core/server/web-server', {
			SocketServer: {
				start: sinon.spy(),
				stop: sinon.spy()
			},
			Config:  {
				logging: {
					logLevel: 'info',
					expressBunyanLogger: {
						excludes: []
					}
				}
			},
			Routes: {
				configure: sinon.spy()
			}
		});

		onStart = sut[0];
		onStop = sut[1].OnStop();

		onStart('../game', modes);
		onStop();
	});

	afterEach(function() {
		onStop();
	});

	it('should tell express to listen on port 3000', function () {
		expect(expressServer.listen.firstCall.args[0]).toEqual(3000);
	});
});

describe('stopping the server', function () {
	var onStart;
	var onStop;

	beforeEach(function() {
		var http = require('http');
		http.createServer = function() { return expressServer; };

		var sut = makeTestible('core/server/web-server', {
			SocketServer: {
				start: sinon.spy(),
				stop: sinon.spy()
			},
			Config:  {
				logging: {
					logLevel: 'info',
					expressBunyanLogger: {
						excludes: []
					}
				}
			},
			Routes: {
				configure: sinon.spy()
			}
		});

		onStart = sut[0];
		onStop = sut[1].OnStop();

		onStart('../game', modes);
		onStop();
	});

	it('it should stop the server', function () {
		expect(expressServer.close.called).toEqual(true);
	});
});