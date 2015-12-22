'use strict';

var expect = require('expect');
var request = require('request');
var sinon = require('sinon');
var makeTestible = require('../../support').makeTestible;
var contains = require('lodash').contains;
var fakeConfig = require('../../fake/config');
var url = require('../../route-testing').url;
var urlAsJson = require('../../route-testing').urlAsJson;

describe('game routes', function () {
	var onServerStart;
	var onServerStop;

	var GamePlayersDataModel = {
    getSavesForGameAndPlayer: function (gameId, playerId, callback) {
      callback([
        {saveId: 1, gameId: 'tetris', playerId: 1234},
        {saveId: 2, gameId: 'pong', playerId: 1234}
      ]);
    }
  };
  var ActualGameDataModel = {
  	getGame: function (gameId, callback) {
  		callback({
  			_id: 'distributedlife+pong',
  			name: 'Pong'
  		});
  	}
  };
  sinon.spy(GamePlayersDataModel, 'getSavesForGameAndPlayer');

	before(function() {
		fakeConfig.stub();
		var routes = makeTestible('routes/server/game-routes', {
			GamePlayersDataModel: GamePlayersDataModel,
			ActualGameDataModel: ActualGameDataModel
		});
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
					expect(res.statusCode).toEqual(200);

					var json = JSON.parse(res.body);
					expect(json.modes).toEqual(['game']);
					done(err);
				}).end();
			});

			it('should provide a link to the players saves', function (done) {
				request.get(opts, function (err, res) {
					expect(res.statusCode).toEqual(200);

					var json = JSON.parse(res.body);
					expect(contains(json.links, {
						what: '/player/saves',
						url: '/player/1234/saves',
						method: 'GET'
					}));
					done(err);
				}).end();
			});

			it('should provide a link create a new save game', function (done) {
				request.get(opts, function (err, res) {
					expect(res.statusCode).toEqual(200);

					var json = JSON.parse(res.body);
					expect(contains(json.links, {
						what: '/saves/new',
						url: '/saves',
						method: 'POST',
						data: { mode: 'game' }
					}));
					done(err);
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
					done(err);
				}).end();
			});
		});
	});

	describe('/games/:gameId/players/:playerId/saves', function () {
	  var uri = '/games/distributedlife+pong/players/1234/saves';

	  before(function () {
			onServerStart('../dummy', {modes: ['game']});
		});

		after(function () {
			onServerStop();
		});

	  describe('as JSON', function () {
	    it('should return the player\'s saves', function (done) {
	      request(urlAsJson(uri), function (err, res) {
	        expect(res.statusCode).toEqual(200);
	        expect(GamePlayersDataModel.getSavesForGameAndPlayer.firstCall.args[0]).toEqual('distributedlife+pong');
	        expect(GamePlayersDataModel.getSavesForGameAndPlayer.firstCall.args[1]).toEqual('1234');
	        expect(JSON.parse(res.body)).toEqual({
	        	game: {
	        		id: 'distributedlife+pong',
	        		name: 'Pong'
	        	},
	          player: {
	            id: '1234',
	            name: 'Ryan'
	          },
	          saves: [
	            {method: 'GET', name: 1, uri: '/saves/1', what: '/save/continue'},
	            {method: 'GET', name: 2, uri: '/saves/2', what: '/save/continue'}
	          ]
	        });
	        done(err);
	      }).end();
	    });
	  });
	});
});