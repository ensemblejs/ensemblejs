'use strict';

var expect = require('expect');
var request = require('request');
var sinon = require('sinon');
var makeTestible = require('../../../support').makeTestible;
var includes = require('lodash').includes;
var config = require('../../../../src/util/config');
var url = require('../../../route-testing').url;

describe('game routes', function () {
	var onServerStart;
	var onServerStop;

	beforeEach(function() {
		sinon.stub(config, 'get').returns({
			debug: {
        develop: false
      },
      logging: {
        expressBunyanLogger: {
          excludes: []
        }
      }
		});
		var routes = makeTestible('routes/server/game-routes');
		var sut = makeTestible('core/server/web-server', {
			Routes: [routes[0]]
		});

		onServerStart = sut[0];
		onServerStop = sut[1].OnServerStop();
	});

	afterEach(function () {
    config.get.restore();
    onServerStop();
  });

	describe('the index', function () {
		var opts = url('/');
		opts.headers = {
			'Accept': 'application/json'
		};

		describe('when there is no game mode specified', function () {
			beforeEach(function () {
				onServerStart('../dummy', {modes: ['default']});
			});

			afterEach(function () {
				onServerStop();
			});

			it('should show only the default game mode', function (done) {
				request.get(opts, function (err, res) {
					expect(res.statusCode).toEqual(200);

					var json = JSON.parse(res.body);
					expect(json.game.modes).toEqual(['default']);
					done(err);
				}).end();
			});

			it('should provide a link to the players saves', function (done) {
				request.get(opts, function (err, res) {
					expect(res.statusCode).toEqual(200);

					var json = JSON.parse(res.body);
					expect(includes(json.links, {
						what: '/game/player/saves',
						url: '/games/gameId/player/1234/saves',
						method: 'GET'
					}));
					done(err);
				}).end();
			});

			it('should provide a link create a new save game', function (done) {
				request.get(opts, function (err, res) {
					expect(res.statusCode).toEqual(200);

					var json = JSON.parse(res.body);
					expect(includes(json.links, {
						what: '/saves/new',
						url: '/saves',
						method: 'POST',
						data: { mode: 'default' }
					}));
					done(err);
				}).end();
			});
		});

		describe('when there is more than one game mode', function () {
			beforeEach(function () {
				onServerStart('../dummy',	{ modes: ['easy', 'hard']});
			});

			afterEach(function () {
				onServerStop();
			});

			it ('should show all game modes', function (done) {
				request.get(opts, function (err, res) {
					expect(res.statusCode).toEqual(200);

					var json = JSON.parse(res.body);
					expect(json.game.modes).toEqual(['easy', 'hard']);
					expect(includes(json.links, {
						what: '/saves/new',
						url: '/saves',
						method: 'POST',
						data: { mode: 'easy' }
					}));
					expect(includes(json.links, {
						what: '/saves/new',
						url: '/saves',
						method: 'POST',
						data: { mode: 'hard' }
					}));
					done(err);
				}).end();
			});
		});
	});
});