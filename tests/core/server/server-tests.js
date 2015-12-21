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

describe('the server', function () {
	var onServerStart;
	var onServerStop;

	var config;
	var originalGet;
	before(function () {
		config = require('../../../src/util/config');
    originalGet = config.get;
    config.get = function () {
      return {
        logging: {
          expressBunyanLogger: {
            excludes: []
          }
        }
      };
    };
	});

	var http;
	var originalCreateServer;
	beforeEach(function () {
		http = require('http');
		originalCreateServer = http.createServer;
		http.createServer = function() { return expressServer; };

		var sut = makeTestible('core/server/web-server', {
			SocketServer: {
				start: sinon.spy(),
				stop: sinon.spy()
			},
			Routes: [],
			WebServerMiddleware: []
		});

		onServerStart = sut[0];
		onServerStop = sut[1].OnServerStop();

		onServerStart('../dummy', modes);
	});

	afterEach(function() {
		onServerStop();
		http.createServer = originalCreateServer;
	});

  after(function () {
    config.get = originalGet;
  });

	it('should tell express to listen on port 3000', function () {
		expect(expressServer.listen.firstCall.args[0]).toEqual(3000);
	});

	it('it should be stoppable', function () {
		expect(expressServer.close.called).toEqual(true);
	});
});