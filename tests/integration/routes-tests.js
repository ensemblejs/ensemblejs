'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../support').makeTestible;

describe('configuring the routes', function () {
	var onStart;
	var onStop;

	before(function() {
		var routes = makeTestible('core/server/routes', {});
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
			Routes: routes[0]
		});

		onStart = sut[0];
		onStop = sut[1].OnStop();
	});

	describe('when the modes are not supplied', function () {
		before(function () {
			onStart('../dummy');
		});

		after(function () {
			onStop();
		});

		it('should map /index to the single game mode', function (done) {
			request.get('http://localhost:3000/', function (err, res) {
				expect(res.statusCode).toEqual(200);
				expect(res.body).toInclude('<script src="/game/js/gen/game.min.js">');
				done();
			}).end();
		});
	});

	describe('when the modes object has more than one element', function () {
		var modes = ['arcade'];

		before(function () {
			onStart('../dummy', modes);
		});

		after(function () {
			onStop();
		});

		it('should provide a route to the index, to be supplied by the gamedev', function (done) {
			request.get('http://localhost:3000/', function (err, res) {
				expect(res.statusCode).toEqual(200);
				done();
			}).end();
		});

		it('should redirect to the root page when the mode is not in the modes', function (done) {
			request({
				followRedirect: function(res) {
					expect(res.statusCode).toEqual(302);
					expect(res.headers.location).toEqual('/');
				},
				uri: 'http://localhost:3000/derp'
			}, function () {
				done();
			}).end();
		});

		it('should invoke the callback specified by the mode', function (done) {
			request.get('http://localhost:3000/arcade', function (err, res) {
				expect(res.statusCode).toEqual(200);
				expect(res.body).toInclude('<script src="/game/js/gen/arcade.min.js">');
				done();
			}).end();
		});

		describe('each of the default routes', function () {
			it('the "primary" view', function (done) {
				request.get('http://localhost:3000/arcade', function (err, res) {
					expect(res.statusCode).toEqual(200);
					done();
				}).end();
			});
		});
	});
});