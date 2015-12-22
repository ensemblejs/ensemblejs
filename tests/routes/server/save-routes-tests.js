'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../../support').makeTestible;
var url = require('../../route-testing').url;
var log = require('../../route-testing').log;
var posturl = require('../../route-testing').posturl;
var fakeConfig = require('../../fake/config');
var fakeOn = require('../../fake/on');
var fakeGamesList = require('../../fake/games-list')('arcade');

describe('save routes', function () {
  var onServerStart;
  var onServerStop;

  var isPlayerInGame = false;
  var canPlayerJoinGame = false;
  var doesGameHaveSpaceForPlayer = false;
  var GamePlayersDataModel = {
    addPlayer: function (saveId, playerId, callback) {
      callback();
    },
    isPlayerInGame: function (saveId, playerId, callback) {
      callback(isPlayerInGame);
    },
    canPlayerJoinGame: function (saveId, playerId, callback) {
      callback(canPlayerJoinGame);
    },
    doesGameHaveSpaceForPlayer: function (saveId, callback) {
      callback(doesGameHaveSpaceForPlayer);
    }
  };
  var GamesDataModel = {
    get: function (gameId, callback) {
      callback({ ensemble: {secret: 'public'}});
    }
  };
  sinon.spy(GamePlayersDataModel, 'addPlayer');

  var maxPlayers = 2;

  beforeEach(function() {
    fakeConfig.stub({
      game: {
        title: 'my cool game'
      },
      ensemble: {
        dashboard: false
      },
      debug: {
        develop: false
      },
      logging: {
        expressBunyanLogger: {
          excludes: []
        }
      },
      maxPlayers: function () {
        return maxPlayers;
      }
    });

    var routes = makeTestible('routes/server/save-routes', {
      UUID: {
        gen: function () { return '34242-324324'; }
      },
      On: fakeOn,
      GamePlayersDataModel: GamePlayersDataModel,
      GamesDataModel: GamesDataModel,
      GamesList: fakeGamesList
    });
    var sut = makeTestible('core/server/web-server', {
      Routes: [routes[0]]
    });

    onServerStart = sut[0];
    onServerStop = sut[1].OnServerStop();

    onServerStart('../dummy', { modes: ['arcade'] });
  });

  afterEach(function () {
    onServerStop();
    fakeConfig.restore();
  });

  describe('GETS', function () {
    describe('/saves/:saveId', function () {
      var uri = '/saves/34242-324324';

      it('should return a 404 if the game does not exist', function (done) {
        var original = fakeGamesList.get;
        fakeGamesList.get = function () { return undefined; };

        request.get(url('/saves/1'), function (err, res) {
          expect(res.statusCode).toEqual(404);
          fakeGamesList.get = original;
          done();
        });
      });

      describe('when the player is in the game', function () {
        beforeEach(function () {
          isPlayerInGame = true;
        });

        it('should show the game page', function (done) {
          request.post(posturl('/saves', {mode: 'arcade'}), function () {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(200);
              expect(res.body).toInclude('<script src="/game/js/client/arcade.min.js">');
              done(err);
            }).end();
          });
        });
      });

      describe('when the player is not in the game', function () {
        beforeEach(function () {
          isPlayerInGame = false;
        });

        it('should redirect to the join page', function (done) {
          request.post(posturl('/saves', {mode: 'arcade'}), function () {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });
    });

    describe('/saves/:saveId/full', function () {
      var uri = '/saves/34242-324324/full';

      it('should return a 404 if the game does not exist', function (done) {
        var original = fakeGamesList.get;
        fakeGamesList.get = function () { return undefined; };

        request.get(url('/saves/1/full'), function (err, res) {
          expect(res.statusCode).toEqual(404);
          fakeGamesList.get = original;
          done(err);
        });
      });

      it('should return the full game page', function (done) {
        request.get(url(uri), function (err, res) {
          expect(res.statusCode).toEqual(200);
          expect(res.body).toInclude('Full');
          done(err);
        });
      });
    });

    describe('/saves/:saveId/join', function () {
      var uri = '/saves/34242-324324/join';

      describe('when the player is already in the game', function () {
        beforeEach(function () {
          isPlayerInGame = true;
        });

        it('should redirect to the continue game page', function (done) {
          request.post(posturl('/saves', {mode: 'arcade'}), function () {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('/saves/34242-324324');
              done(err);
            }).end();
          });
        });
      });

      describe('when the player is not already in the game', function () {
        beforeEach(function () {
          isPlayerInGame = false;
        });

        describe('when the game is full', function () {
           beforeEach(function () {
            doesGameHaveSpaceForPlayer = false;
          });

          it('should redirect to the full page', function (done) {
            request.post(posturl('/saves', {mode: 'arcade'}), function () {
              request.get(url(uri), function (err, res) {
                expect(res.statusCode).toEqual(302);
                expect(res.headers.location).toEqual('/saves/34242-324324/full');
                done(err);
              }).end();
            });
          });
        });

        describe('when the game is not full', function () {
          beforeEach(function () {
            doesGameHaveSpaceForPlayer = true;
          });

          it('should render to the join game page', function (done) {
            request.post(posturl('/saves', {mode: 'arcade'}), function () {
              request.get(url(uri), function (err, res) {
                expect(res.statusCode).toEqual(200);
                expect(res.body).toInclude('join');
                done(err);
              }).end();
            });
          });
        });
      });
    });

    describe('/saves/:saveId/share', function () {
      var uri = '/saves/34242-324324/share';

      beforeEach(function (done) {
        request.post(posturl('/saves', {mode: 'arcade'}), done);
      });

      describe('when the game is single player', function () {
        beforeEach(function () {
          maxPlayers = 1;
        });

         describe('when the player is already in the game', function () {
          beforeEach(function () {
            isPlayerInGame = true;
          });

          it('should redirect to the continue game page', function (done) {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('/saves/34242-324324');
              done(err);
            }).end();
          });
        });

        describe('when the player is not in the game', function () {
          beforeEach(function () {
            isPlayerInGame = false;
          });

          it('should redirect to the continue game page', function (done) {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });

      describe('when the game is multiplayer', function () {
        beforeEach(function () {
          maxPlayers = 2;
        });

        describe('when the player is already in the game', function () {
          beforeEach(function () {
            isPlayerInGame = true;
          });

          it('should show the share page', function (done) {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(200);
              expect(res.body).toInclude('share');
              done(err);
            });
          });
        });

        describe('when the player is not in the game', function () {
          beforeEach(function () {
            isPlayerInGame = false;
          });

          it('should redirect to the continue game page', function (done) {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });
    });
  });

  describe.skip('POSTS', function () {
    beforeEach(function () {
      fakeOn.newGame.reset();
      fakeOn.gameReady.reset();
    });

    describe('/saves', function () {
      it('should report an error if the mode is not supplied', function (done) {
        request.post(posturl('/saves', {}), function (err, res) {
          expect(res.statusCode).toEqual(400);
          expect(fakeOn.newGame.called).toEqual(false);
          expect(fakeOn.gameReady.called).toEqual(false);
          done(err);
        });
      });

      it('should report an error if the mode is invalid', function (done) {
        request.post(posturl('/saves', { mode: 'endless '}), function (err, res) {
          expect(res.statusCode).toEqual(400);
          expect(fakeOn.newGame.called).toEqual(false);
          expect(fakeOn.gameReady.called).toEqual(false);
          done(err);
        });
      });

      it('should emit the OnNewGame event', function (done) {
        request.post(posturl('/saves', {mode: 'arcade'}), function (err) {
          expect(fakeOn.newGame.called).toEqual(true);
          done(err);
        });
      });

      it('should emit the OnGameReady event', function (done) {
        request.post(posturl('/saves', {mode: 'arcade'}), function (err) {
          expect(fakeOn.gameReady.called).toEqual(true);
          done(err);
        });
      });

      it('should redirect to the continue game url', function (done) {
        request.post(posturl('/saves', {mode: 'arcade'}), function (err, res) {
          expect(res.statusCode).toEqual(302);
          expect(res.headers.location).toEqual('/saves/34242-324324/share');
          done(err);
        });
      });
    });

    describe('/saves/:saveId/join', function () {
      describe('when the player is already in the game', function () {
        it('should redirect to the game');
      });

      describe('when the player is not already in the game', function () {
        describe('when the game is full', function () {
          it('should redirect to full');
        });

        describe('when the game is not full', function () {
          describe('when the game is public', function () {
            it('should add the player to the game', function () {
              expect(GamePlayersDataModel.addPlayer.firstCall.args[0]).toEqual('1234');
            });

            it('should redirect to the game');
          });

          describe('when the game is private', function () {
            describe('when the secret is incorrect', function () {
              it('should redirect to the join page');
            });

            describe('when the secret is correct', function () {
              it('should add the player to the game', function () {
                expect(GamePlayersDataModel.addPlayer.firstCall.args[0]).toEqual('1234');
              });

              it('should redirect to the game');
            });
          });
        });
      });
    });
  });

  describe.skip('/saves/:playerId/saves', function () {
    var GamePlayersDataModel = {
      getGamesForPlayer: function(playerId, callback) {
        callback([
          {saveId: 1, gameId: 'tetris', playerId: 1234},
          {saveId: 2, gameId: 'pong', playerId: 1234}
        ]);
      }
    };
    sinon.spy(GamePlayersDataModel, 'getGamesForPlayer');

    beforeEach(function() {
      fakeConfig.stub();

      var routes = makeTestible('routes/server/player-routes', {
        GamePlayersDataModel: GamePlayersDataModel
      });
      var sut = makeTestible('core/server/web-server', {
        Routes: [routes[0]]
      });

      onServerStart = sut[0];
      onServerStop = sut[1].OnServerStop();

      onServerStart('../dummy', ['game']);
    });

    afterEach(function () {
      onServerStop();
      fakeConfig.restore();
    });

    describe('as json', function () {
      var opts;
      beforeEach(function () {
        opts = {
          url: url('/players/1234/saves'),
          headers: {
            Accept: 'application/json'
          }
        };
      });

      it('should return the player\'s saves', function (done) {
        request(opts, function (err, res) {
          log(err);

          expect(res.statusCode).toEqual(200);
          expect(GamePlayersDataModel.getGamesForPlayer.firstCall.args[0]).toEqual('1234');
          expect(JSON.parse(res.body)).toEqual({
            player: {
              id: '1234',
              name: 'Ryan'
            },
            saves: [
              {method:'GET',name:1,uri:'/saves/1',what:'/save/continue'},
              {method:'GET',name:2,uri:'/saves/2',what:'/save/continue'}
            ]
          });
          done();
        }).end();
      });
    });
  });
});