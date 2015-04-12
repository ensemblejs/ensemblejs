'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');

var deferDep = require('../helpers.js').deferDep;
var socketSupport = {
	start: sinon.spy(),
	stop: sinon.spy()
};

describe('configuring the routes', function () {
	var io;
	var server;

	before(function() {
		io = require('socket.io');
		io.listen = sinon.spy();
		io.of = sinon.spy();

		server = require('../../src/server').func(deferDep(socketSupport));
	});

	describe('when the callbacks supplied is a single function', function () {
		var callbacks = sinon.spy();

		before(function () {
			server.start('../dummy', callbacks);
		});

		after(function () {
			server.stop();
		});

		it('should map /index to the single game mode', function (done) {
			request.get('http://localhost:3000/', function (err, res) {
				expect(res.statusCode).toEqual(200);
				expect(res.body).toInclude('<script src="/game/js/gen/game.js">');
				done();
			}).end();
		});
	});

	describe('when the modes object is a hash', function () {
		var callbacks = {
			arcade: sinon.spy()
		};

		before(function () {
			server.start('../dummy', callbacks);
		});

		after(function () {
			server.stop();
		});

		it('should provide a route to the index, to be supplied by the gamedev', function (done) {
			request.get('http://localhost:3000/', function (err, res) {
				expect(res.statusCode).toEqual(200);
				done();
			}).end();
		});

		it('should redirect to the root page when the mode is not in the callbacks', function (done) {
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

		it.skip('should invoke the callback specified by the mode', function (done) {
			request.get('http://localhost:3000/arcade', function (err, res) {
				expect(res.statusCode).toEqual(200);
				expect(res.body).toInclude('<script src="/game/js/gen/arcade.js">');
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