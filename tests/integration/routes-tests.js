'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../support').makeTestible;
var fakeMetrics = require('../fake/metrics');
var fakeOn = require('../fake/on');
var fakeGamesList = require('../fake/games-list')('arcade');

describe('game routes', function () {
	var onServerStart;
	var onServerStop;

	function url (path) {
		return ['http://localhost:3000', path].join('');
	}

	function posturl (path, body) {
		return {
			uri : url(path),
			method: 'POST',
			body: body,
			json: true
		};
	}

	before(function() {
		var routes = makeTestible('core/server/routes', {
			UUID: {
				gen: function () {
					return '34242-324324';
				}
			},
			Config:  {
				ensemble: {
					dashboard: false
				},
				debug: {
					enabled: false,
				},
			},
			On: fakeOn,
			Metrics: fakeMetrics,
			GamesList: fakeGamesList
		});
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
			Routes: routes[0],
			RequestEventPublisher: { middleware: function(a, b, next) {
				next();
			}}
		});

		onServerStart = sut[0];
		onServerStop = sut[1].OnServerStop();
	});

	describe('the index', function () {
		describe('as json', function () {
			var opts = {
				url: url('/'),
				headers: {
					'Accept': 'application/json'
				}
			};

			describe('when there is no game mode specified', function () {
				before(function () {
					onServerStart('../dummy', {modes: ['game']});
				});

				after(function () {
					onServerStop();
				});

				it('should show only the default game mode', function (done) {
					request.get(opts, function (err, res) {
						expect(res.statusCode).toEqual(200);

						var json = JSON.parse(res.body);
						expect(json.modes).toEqual(['game']);
						expect(json.links[0].what).toEqual('/game/game/new');
						expect(json.links[0].uri).toEqual('/games');
						expect(json.links[0].method).toEqual('POST');
						expect(json.links[0].data).toEqual({ mode: 'game'});
						done();
					}).end();
				});
			});

			describe('when there is more than one game mode', function () {
				before(function () {
					onServerStart('../dummy',	{ modes: ['easy', 'hard']});
				});

				after(function () {
					onServerStop();
				});

				it ('should show all game modes', function (done) {
					request.get(opts, function (err, res) {
						expect(res.statusCode).toEqual(200);

						var json = JSON.parse(res.body);
						expect(json.modes).toEqual(['easy', 'hard']);
						expect(json.links[0].what).toEqual('/game/easy/new');
						expect(json.links[0].uri).toEqual('/games');
						expect(json.links[0].method).toEqual('POST');
						expect(json.links[0].data).toEqual({ mode: 'easy'});
						expect(json.links[1].what).toEqual('/game/hard/new');
						expect(json.links[1].uri).toEqual('/games');
						expect(json.links[1].method).toEqual('POST');
						expect(json.links[1].data).toEqual({ mode: 'hard'});
						done();
					}).end();
				});
			});

			describe('when no request type specified', function () {
				before(function () {
					onServerStart('../dummy', ['arcade']);
				});

				after(function () {
					onServerStop();
				});

				it('should provide a route to the index', function (done) {
					request.get(url('/'), function (err, res) {
						expect(res.statusCode).toEqual(200);
						done();
					}).end();
				});
			});
		});
	});

	describe('given a mode', function () {
		before(function () {
			onServerStart('../dummy', {modes: ['arcade']});
		});

		after(function () {
			onServerStop();
		});

		describe('starting a new game', function () {
			it('should report an error if the mode is not supplied', function (done) {
				request.post(posturl('/games', {}), function (err, res) {
					expect(res.statusCode).toEqual(400);
					done();
				});
			});

			it('should redirect to the continue game url', function (done) {
				request.post(posturl('/games', {mode: 'arcade'}), function (err, res) {
					expect(res.statusCode).toEqual(302);
					expect(res.headers.location).toEqual('/games/34242-324324');
					done();
				});
			});
		});

		describe('continuing a new game', function () {
			it('should return a 404 if the game does not exist', function (done) {
				var original = fakeGamesList.get;
				fakeGamesList.get = function () { return undefined; };

				request.get(url('/games/1'), function (err, res) {
					expect(res.statusCode).toEqual(404);
					fakeGamesList.get = original;
					done();
				});
			});

			it('should invoke the callback specified by the mode', function (done) {
				request.post(posturl('/games', {mode: 'arcade'}), function () {
					request.get(url('/games/34242-324324'), function (err, res) {
						expect(res.statusCode).toEqual(200);
						expect(res.body).toInclude('<script src="/game/js/gen/arcade.min.js">');
						done(err);
					});
				});
			});
		});
	});
});