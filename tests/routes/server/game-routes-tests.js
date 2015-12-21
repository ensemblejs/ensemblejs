'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../../support').makeTestible;
var fakeMetrics = require('../../fake/metrics');
var fakeOn = require('../../fake/on');
var fakeGamesList = require('../../fake/games-list')('arcade');
var fakeDeterminePlayerId = require('../../fake/determine-player-id');
var fakeI18n = require('../../fake/i18n');
var contains = require('lodash').contains;

describe('game routes', function () {
	var onServerStart;
	var onServerStop;

  function log (err) {
    if (!err) {
      return;
    }

    console.error(err);
  }

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
		var config = require('../../../src/util/config');
    config. get = function () {
      return {
      	debug: {
      		develop: false
      	},
        logging: {
          expressBunyanLogger: {
            excludes: []
          }
        }
      };
    };

		var routes = makeTestible('routes/server/game-routes', {
			UUID: {
				gen: function () {
					return '34242-324324';
				}
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
			Routes: [routes[0]],
			WebServerMiddleware: [fakeDeterminePlayerId, fakeI18n]
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
						log(err);
						expect(res.statusCode).toEqual(200);

						var json = JSON.parse(res.body);
						expect(json.modes).toEqual(['game']);
						done();
					}).end();
				});

				it('should provide a link to the players saves', function (done) {
					request.get(opts, function (err, res) {
						log(err);
						expect(res.statusCode).toEqual(200);

						var json = JSON.parse(res.body);
						expect(contains(json.links, {
							what: '/player/saves',
							url: '/player/1234/saves',
							method: 'GET'
						}));
						done();
					}).end();
				});

				it('should provide a link create a new save game', function (done) {
					request.get(opts, function (err, res) {
						log(err);
						expect(res.statusCode).toEqual(200);

						var json = JSON.parse(res.body);
						expect(contains(json.links, {
							what: '/saves/new',
							url: '/saves',
							method: 'POST',
							data: { mode: 'game' }
						}));
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
						log(err);
						expect(res.statusCode).toEqual(200);

						var json = JSON.parse(res.body);
						expect(json.modes).toEqual(['easy', 'hard']);
						expect(contains(json.links, {
							what: '/saves/new',
							url: '/saves',
							method: 'POST',
							data: { mode: 'easy' }
						}));
						expect(contains(json.links, {
							what: '/saves/new',
							url: '/saves',
							method: 'POST',
							data: { mode: 'hard' }
						}));
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
						log(err);
						expect(res.statusCode).toEqual(200);
						done();
					}).end();
				});
			});
		});
	});

	describe.skip('given a mode', function () {
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
					expect(fakeOn.newGame.called).toEqual(false);
					done();
				});
			});

			it('should emit the OnNewGame event', function (done) {
				request.post(posturl('/games', {mode: 'arcade'}), function () {
					expect(fakeOn.newGame.called).toEqual(true);
					done();
				});
			});

			it('should emit the OnGameReady event', function (done) {
				request.post(posturl('/games', {mode: 'arcade'}), function () {
					expect(fakeOn.gameReady.called).toEqual(true);
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