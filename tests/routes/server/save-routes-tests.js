'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../../support').makeTestible;
var url = require('../../route-testing').url;
var posturl = require('../../route-testing').posturl;
var config = require('../../../src/util/config');
var on = require('../../fake/on');
var time = require('../../fake/time').at(0);
var savesList = require('../../fake/saves-list')('arcade');
var Bluebird = require('bluebird');
var saves = require('../../../src/util/models/saves');
var savePlayers = require('../../../src/util/models/players-in-save');
var urlShortener = require('../../../src/services/url-shortener');

describe('save routes', function () {
  var onServerStart;
  var onServerStop;

  var isPlayerInSave;
  var hasSpaceForPlayer;
  var isSecretCorrect;
  var isPublic;
  var uuid;

  var maxPlayers = 2;

  var configStub;
  var shortenerStub;
  beforeEach(function() {
    configStub = sinon.stub(config, 'get').returns({
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

    isPlayerInSave = sinon.stub(savePlayers, 'isPlayerInSave');
    hasSpaceForPlayer = sinon.stub(savePlayers, 'hasSpaceForPlayer');
    sinon.stub(savePlayers, 'addPlayer').returns(new Bluebird(function(resolve) {
      resolve();
    }));
    isSecretCorrect = sinon.stub(saves, 'isSecretCorrect');
    isPublic = sinon.stub(saves, 'isPublic');
    sinon.stub(saves, 'getById').returns(new Bluebird(function(resolve) {
      resolve({ ensemble: {secret: 'public'}});
    }));
    shortenerStub = sinon.stub(urlShortener, 'shorten').returns(
      new Bluebird(function(resolve) {resolve(undefined);})
    );

    uuid = require('node-uuid');
    sinon.stub(uuid, 'v4').returns('34242-324324');

    var routes = makeTestible('routes/server/save-routes', {
      On: on,
      Time: time,
      SavesList: savesList
    });
    var sut = makeTestible('core/server/web-server', {
      Routes: [routes[0]]
    });

    onServerStart = sut[0];
    onServerStop = sut[1].OnServerStop();

    onServerStart('../dummy', {
      id: 'distributedlife+pong', name: 'Pong', modes: ['arcade']
    });
  });

  afterEach(function () {
    isPlayerInSave.restore();
    hasSpaceForPlayer.restore();
    isSecretCorrect.restore();
    isPublic.restore();
    saves.getById.restore();
    savePlayers.addPlayer.restore();
    uuid.v4.restore();

    onServerStop();
    configStub.restore();
    shortenerStub.restore();
  });

  describe('GETS', function () {
    describe('/saves/:saveId', function () {
      var uri = '/saves/34242-324324';

      it('should return a 404 if the game does not exist', function (done) {
        var original = savesList.get;
        savesList.get = function () { return undefined; };

        request.get(url('/saves/1'), function (err, res) {
          expect(res.statusCode).toEqual(404);
          savesList.get = original;
          done();
        });
      });

      describe('when the player is in the game', function () {
        beforeEach(function () {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(true);
          }));
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
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(false);
          }));
        });

        it('should redirect to the join page', function (done) {
          request.post(posturl('/saves', {mode: 'arcade'}), function () {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });
    });

    describe('/saves/:saveId/full', function () {
      var uri = '/saves/34242-324324/full';

      it('should return a 404 if the game does not exist', function (done) {
        var original = savesList.get;
        savesList.get = function () { return undefined; };

        request.get(url('/saves/1/full'), function (err, res) {
          expect(res.statusCode).toEqual(404);
          savesList.get = original;
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
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(true);
          }));
        });

        it('should redirect to the continue game page', function (done) {
          request.post(posturl('/saves', {mode: 'arcade'}), function () {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
              done(err);
            }).end();
          });
        });
      });

      describe('when the player is not already in the game', function () {
        beforeEach(function () {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(false);
          }));
        });

        describe('when the game is full', function () {
           beforeEach(function () {
            hasSpaceForPlayer.returns(new Bluebird(function(resolve) {
              resolve(false);
            }));
          });

          it('should redirect to the full page', function (done) {
            request.post(posturl('/saves', {mode: 'arcade'}), function () {
              request.get(url(uri), function (err, res) {
                expect(res.statusCode).toEqual(302);
                expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/full');
                done(err);
              }).end();
            });
          });
        });

        describe('when the game is not full', function () {
          beforeEach(function () {
            hasSpaceForPlayer.returns(new Bluebird(function(resolve) {
              resolve(true);
            }));
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
            isPlayerInSave.returns(new Bluebird(function(resolve) {
              resolve(true);
            }));
          });

          it('should redirect to the continue game page', function (done) {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
              done(err);
            }).end();
          });
        });

        describe('when the player is not in the game', function () {
          beforeEach(function () {
            isPlayerInSave.returns(new Bluebird(function(resolve) {
              resolve(false);
            }));
          });

          it('should redirect to the continue game page', function (done) {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
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
            isPlayerInSave.returns(new Bluebird(function(resolve) {
              resolve(true);
            }));
          });

          it('should show the share page', function (done) {
            console.log('CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC');
            request.get(url(uri), function (err, res) {
              console.log('CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC');
              expect(res.statusCode).toEqual(200);
              expect(res.body).toInclude('share');
              done(err);
            });
          });
        });

        describe('when the player is not in the game', function () {
          beforeEach(function () {
            isPlayerInSave.returns(new Bluebird(function(resolve) {
              resolve(false);
            }));
          });

          it('should redirect to the continue game page', function (done) {
            request.get(url(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });
    });
  });

  describe('POSTS', function () {
    beforeEach(function () {
      on.newSave.reset();
      on.saveReady.reset();
    });

    describe('/saves', function () {
      var uri = '/saves';

      it('should report an error if the mode is not supplied', function (done) {
        request.post(posturl(uri, {}), function (err, res) {
          expect(res.statusCode).toEqual(400);
          expect(on.newSave.called).toEqual(false);
          expect(on.saveReady.called).toEqual(false);
          done(err);
        });
      });

      it('should report an error if the mode is invalid', function (done) {
        request.post(posturl(uri, { mode: 'endless '}), function (err, res) {
          expect(res.statusCode).toEqual(400);
          expect(on.newSave.called).toEqual(false);
          expect(on.saveReady.called).toEqual(false);
          done(err);
        });
      });

      it('should emit the OnNewGame event', function (done) {
        request.post(posturl(uri, {mode: 'arcade'}), function (err) {
          expect(on.newSave.called).toEqual(true);
          done(err);
        });
      });

      it('should emit the OnGameReady event', function (done) {
        request.post(posturl(uri, {mode: 'arcade'}), function (err) {
          expect(on.saveReady.called).toEqual(true);
          done(err);
        });
      });

      it('should redirect to the share game url', function (done) {
        request.post(posturl(uri, {mode: 'arcade'}), function (err, res) {
          expect(res.statusCode).toEqual(302);
          expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/share');
          done(err);
        });
      });
    });

    describe('/saves/:saveId/join', function () {
      var uri = '/saves/34242-324324/join';

      beforeEach(function (done) {
        request.post(posturl('/saves', {mode: 'arcade'}), done);
      });

      describe('when the player is already in the game', function () {
        beforeEach(function () {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(true);
          }));
        });

        it('should redirect to continue game', function (done) {
          request.post(posturl(uri), function (err, res) {
            expect(res.statusCode).toEqual(302);
            expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
            done(err);
          });
        });
      });

      describe('when the player is not in the game', function () {
        beforeEach(function () {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(false);
          }));
        });

        describe('when the game is full', function () {
          beforeEach(function () {
            hasSpaceForPlayer.returns(new Bluebird(function(resolve) {
              resolve(false);
            }));
          });

          it('should redirect to continue game', function (done) {
            request.post(posturl(uri), function (err, res) {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/full');
              done(err);
            });
          });
        });

        describe('when the game is not full', function () {
          beforeEach(function () {
            hasSpaceForPlayer.returns(new Bluebird(function(resolve) {
              resolve(true);
            }));
          });

          describe('when the game is public', function () {
            beforeEach(function () {
              savePlayers.addPlayer.reset();
              isPublic.returns(new Bluebird(function(resolve) {
                resolve(true);
              }));
            });

            it('should add the player to the game', function (done) {
              request.post(posturl(uri, {secret: 'correct'}), function (err) {
                expect(savePlayers.addPlayer.firstCall.args[0]).toEqual('distributedlife+pong');
                expect(savePlayers.addPlayer.firstCall.args[1]).toEqual('34242-324324');
                expect(savePlayers.addPlayer.firstCall.args[2]).toEqual('p1234');
                done(err);
              });
            });

            it('should redirect to continue game', function (done) {
              request.post(posturl(uri), function (err, res) {
                expect(res.statusCode).toEqual(302);
                expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
                done(err);
              });
            });
          });

          describe('when the game is private', function () {
            beforeEach(function () {
              isPublic.returns(new Bluebird(function(resolve) {
                resolve(false);
              }));
            });

            describe('when no secret is supplied', function () {
              it('should return a 400', function (done) {
                request.post(posturl(uri, {}), function (err, res) {
                  expect(res.statusCode).toEqual(400);
                  done(err);
                });
              });
            });

            describe('when the secret is incorrect', function () {
              beforeEach(function () {
                isSecretCorrect.returns(new Bluebird(function(resolve) {
                  resolve(false);
                }));
              });

              it('should redirect to the join page', function (done) {
                request.post(posturl(uri, {secret: 'not-correct'}), function (err, res) {
                  expect(res.statusCode).toEqual(302);
                  expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
                  done(err);
                });
              });
            });

            describe('when the secret is correct', function () {
              beforeEach(function () {
                savePlayers.addPlayer.reset();
                isSecretCorrect.returns(new Bluebird(function(resolve) {
                  resolve(true);
                }));
              });

              it('should add the player to the game', function (done) {
                request.post(posturl(uri, {secret: 'correct'}), function (err) {
                  expect(savePlayers.addPlayer.firstCall.args[0]).toEqual('distributedlife+pong');
                  expect(savePlayers.addPlayer.firstCall.args[1]).toEqual('34242-324324');
                  expect(savePlayers.addPlayer.firstCall.args[2]).toEqual('p1234');
                  done(err);
                });
              });

              it('should redirect to continue game', function (done) {
                request.post(posturl(uri, {secret: 'correct'}), function (err, res) {
                  expect(res.statusCode).toEqual(302);
                  expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
                  done(err);
                });
              });
            });
          });
        });
      });
    });
  });
});