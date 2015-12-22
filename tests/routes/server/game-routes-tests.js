'use strict';

var expect = require('expect');
var request = require('request');
var makeTestible = require('../../support').makeTestible;
var contains = require('lodash').contains;
var fakeConfig = require('../../fake/config');
var url = require('../../route-testing').url;
var log = require('../../route-testing').log;

describe('game routes', function () {
	var onServerStart;
	var onServerStop;

	before(function() {
		fakeConfig.stub();
		var routes = makeTestible('routes/server/game-routes');
		var sut = makeTestible('core/server/web-server', {
			Routes: [routes[0]]
		});

		onServerStart = sut[0];
		onServerStop = sut[1].OnServerStop();
	});

	after(function () {
    onServerStop();
    fakeConfig.restore();
  });

	describe('the index', function () {
		var opts = url('/');
		opts.headers = {
			'Accept': 'application/json'
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
	});
});