'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../../../support').makeTestible;
var url = require('../../../route-testing').url;
var posturl = require('../../../route-testing').posturl;
var config = require('../../../../src/util/config');
var on = require('../../../fake/on');
var time = require('../../../fake/time').at(0);
var savesList = require('../../../fake/saves-list')('arcade');
var Bluebird = require('bluebird');
var saves = require('../../../../src/util/models/saves');
var urlShortener = require('../../../../src/services/url-shortener');

describe('save routes', () => {
  var onServerStart;
  var onServerStop;

  var isPlayerInSave;
  var hasSpaceForPlayer;
  var isSecretCorrect;
  var isPublic;
  var isAutoAdd;
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
      maxPlayers: () => {
        return maxPlayers;
      }
    });

    isPlayerInSave = sinon.stub(saves, 'isPlayerInSave');
    hasSpaceForPlayer = sinon.stub(saves, 'hasSpaceForPlayer');
    sinon.stub(saves, 'addPlayer').returns(new Bluebird(function(resolve) {
      resolve();
    }));
    isSecretCorrect = sinon.stub(saves, 'isSecretCorrect');
    isPublic = sinon.stub(saves, 'isPublic');
    isAutoAdd = sinon.stub(saves, 'isAutoAdd');
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

  afterEach(() => {
    isPlayerInSave.restore();
    hasSpaceForPlayer.restore();
    isSecretCorrect.restore();
    isPublic.restore();
    isAutoAdd.restore();
    saves.getById.restore();
    saves.addPlayer.restore();
    uuid.v4.restore();

    onServerStop();
    configStub.restore();
    shortenerStub.restore();
  });

  describe('GETS', () => {
    describe('/saves/:saveId', () => {
      var uri = '/saves/34242-324324';

      it('should return a 404 if the game does not exist', done => {
        var original = savesList.get;
        savesList.get = () => { return undefined; };

        request.get(url('/saves/1'), (err, res) => {
          expect(res.statusCode).toEqual(404);
          savesList.get = original;
          done();
        });
      });

      describe('when the player is in the game', () => {
        beforeEach(() => {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(true);
          }));
        });

        describe('when the player has not specified a device mode', () => {
          it('should redirect to selectDeviceMode', done => {
            request.post(posturl('/saves', {mode: 'arcade'}), () => {
              request.get(url(uri), (err, res) => {
                expect(res.statusCode).toEqual(302);
                expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/selectDeviceMode');
                done(err);
              }).end();
            });
          });
        });

        describe('when the player has selected a device mode', done => {
          it('should redirect to selectDeviceMode on unsupported deviceMode', done => {
            request.post(posturl('/saves', {mode: 'arcade'}), () => {
              request.get(url(`${uri}?deviceMode=banana`), (err, res) => {
                expect(res.statusCode).toEqual(302);
                expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/selectDeviceMode');
                done(err);
              }).end();
            });
          });

          it('should show the game page', done => {
            request.post(posturl('/saves', {mode: 'arcade'}), () => {
              request.get(url(`${uri}?deviceMode=primary`), (err, res) => {
                expect(res.statusCode).toEqual(200);
                expect(res.body).toInclude('<script src="/game/js/client/arcade.min.js">');
                done(err);
              }).end();
            });
          });
        });
      });

      describe('when the player is not in the game', () => {
        beforeEach(() => {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(false);
          }));
        });

        it('should redirect to the join page', done => {
          request.post(posturl('/saves', {mode: 'arcade'}), () => {
            request.get(url(uri), (err, res) => {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });
    });

    describe('/saves/:saveId/full', () => {
      var uri = '/saves/34242-324324/full';

      it('should return a 404 if the game does not exist', done => {
        var original = savesList.get;
        savesList.get = () => { return undefined; };

        request.get(url('/saves/1/full'), (err, res) => {
          expect(res.statusCode).toEqual(404);
          savesList.get = original;
          done(err);
        });
      });

      it('should return the full game page', done => {
        request.get(url(uri), (err, res) => {
          expect(res.statusCode).toEqual(200);
          expect(res.body).toInclude('Full');
          done(err);
        });
      });
    });

    describe('/saves/:saveId/selectDeviceMode', () => {
      var uri = '/saves/34242-324324/selectDeviceMode';

      it('should return a 404 if the game does not exist', done => {
        var original = savesList.get;
        savesList.get = () => { return undefined; };

        request.get(url('/saves/1/full'), (err, res) => {
          expect(res.statusCode).toEqual(404);
          savesList.get = original;
          done(err);
        });
      });

       describe('when the player is in the game', () => {
        beforeEach(() => {
          isPlayerInSave.returns(new Bluebird(resolve => resolve(true)));
        });

        it('should return the select device mode page', done => {
          request.get(url(uri), (err, res) => {
            expect(res.statusCode).toEqual(200);
            expect(res.body).toInclude('Select device mode');
            done(err);
          });
        });
      });

      describe('when the player is not in the game', () => {
        beforeEach(() => {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(false);
          }));
        });

        it('should redirect to the join page', done => {
          request.post(posturl('/saves', {mode: 'arcade'}), () => {
            request.get(url(uri), (err, res) => {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });
    });

    describe('/saves/:saveId/join', () => {
      var uri = '/saves/34242-324324/join';

      describe('when the player is already in the game', () => {
        beforeEach(() => {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(true);
          }));
        });

        it('should redirect to the continue game page', done => {
          request.post(posturl('/saves', {mode: 'arcade'}), () => {
            request.get(url(uri), (err, res) => {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
              done(err);
            }).end();
          });
        });
      });

      describe('when the player is not already in the game', () => {
        beforeEach(() => {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(false);
          }));
        });

        describe('when the game is full', () => {
          beforeEach(() => {
            hasSpaceForPlayer.returns(new Bluebird(function(resolve) {
              resolve(false);
            }));
          });

          it('should redirect to the full page', done => {
            request.post(posturl('/saves', {mode: 'arcade'}), () => {
              request.get(url(uri), (err, res) => {
                expect(res.statusCode).toEqual(302);
                expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/full');
                done(err);
              }).end();
            });
          });
        });

        describe('when the game is not full', () => {
          beforeEach(() => {
            hasSpaceForPlayer.returns(new Bluebird(function(resolve) {
              resolve(true);
            }));
          });

          describe('when the game is "public-auto"', () => {
            beforeEach(() => {
              saves.addPlayer.reset();
              isAutoAdd.returns(new Bluebird(resolve => resolve(true)));
            });

            it('should add the player to the game', done => {
              request.post(posturl('/saves', {mode: 'arcade'}), () => {
                saves.addPlayer.reset();

                request.get(url(uri), function (err) {
                  expect(saves.addPlayer.firstCall.args[0]).toEqual('34242-324324');
                  expect(saves.addPlayer.firstCall.args[1]).toEqual('p1234');
                  done(err);
                }).end();
              });
            });

            it('should render to the continue game page', done => {
              request.post(posturl('/saves', {mode: 'arcade'}), () => {
                request.get(url(uri), (err, res) => {
                  expect(res.statusCode).toEqual(302);
                  expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
                  done(err);
                }).end();
              });
            });
          });

          describe('when the game is not "public-auto', () => {
            beforeEach(() => {
              isAutoAdd.returns(new Bluebird(resolve => resolve(false)));
            });

            it('should render to the join game page', done => {
              request.post(posturl('/saves', {mode: 'arcade'}), () => {
                request.get(url(uri), (err, res) => {
                  expect(res.statusCode).toEqual(200);
                  expect(res.body).toInclude('join');
                  done(err);
                }).end();
              });
            });
          });
        });
      });
    });

    describe('/saves/:saveId/share', () => {
      var uri = '/saves/34242-324324/share';

      beforeEach(done => {
        request.post(posturl('/saves', {mode: 'arcade'}), done);
      });

      describe('when the game is single player', () => {
        beforeEach(() => {
          maxPlayers = 1;
        });

         describe('when the player is already in the game', () => {
          beforeEach(() => {
            isPlayerInSave.returns(new Bluebird(function(resolve) {
              resolve(true);
            }));
          });

          it('should redirect to the continue game page', done => {
            request.get(url(uri), (err, res) => {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
              done(err);
            }).end();
          });
        });

        describe('when the player is not in the game', () => {
          beforeEach(() => {
            isPlayerInSave.returns(new Bluebird(function(resolve) {
              resolve(false);
            }));
          });

          it('should redirect to the continue game page', done => {
            request.get(url(uri), (err, res) => {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });

      describe('when the game is multiplayer', () => {
        beforeEach(() => {
          maxPlayers = 2;
        });

        describe('when the player is already in the game', () => {
          beforeEach(() => {
            isPlayerInSave.returns(new Bluebird(function(resolve) {
              resolve(true);
            }));
          });

          it('should show the share page', done => {
            request.get(url(uri), (err, res) => {
              expect(res.statusCode).toEqual(200);
              expect(res.body).toInclude('share');
              done(err);
            });
          });
        });

        describe('when the player is not in the game', () => {
          beforeEach(() => {
            isPlayerInSave.returns(new Bluebird(function(resolve) {
              resolve(false);
            }));
          });

          it('should redirect to the continue game page', done => {
            request.get(url(uri), (err, res) => {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
              done(err);
            }).end();
          });
        });
      });
    });
  });

  describe('POSTS', () => {
    beforeEach(() => {
      on.newSave.reset();
      on.saveReady.reset();
    });

    describe('/saves', () => {
      var uri = '/saves';

      it('should report an error if the mode is not supplied', done => {
        request.post(posturl(uri, {}), (err, res) => {
          expect(res.statusCode).toEqual(400);
          expect(on.newSave.called).toEqual(false);
          expect(on.saveReady.called).toEqual(false);
          done(err);
        });
      });

      it('should report an error if the mode is invalid', done => {
        request.post(posturl(uri, { mode: 'endless '}), (err, res) => {
          expect(res.statusCode).toEqual(400);
          expect(on.newSave.called).toEqual(false);
          expect(on.saveReady.called).toEqual(false);
          done(err);
        });
      });

      it('should emit the OnNewGame event', done => {
        request.post(posturl(uri, {mode: 'arcade'}), function (err) {
          expect(on.newSave.called).toEqual(true);
          done(err);
        });
      });

      it('should emit the OnGameReady event', done => {
        request.post(posturl(uri, {mode: 'arcade'}), function (err) {
          expect(on.saveReady.called).toEqual(true);
          done(err);
        });
      });

      it('should redirect to the share game url', done => {
        request.post(posturl(uri, {mode: 'arcade'}), (err, res) => {
          expect(res.statusCode).toEqual(302);
          expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/share');
          done(err);
        });
      });
    });

    describe('/saves/:saveId/join', () => {
      var uri = '/saves/34242-324324/join';

      beforeEach(done => {
        request.post(posturl('/saves', {mode: 'arcade'}), done);
      });

      describe('when the player is already in the game', () => {
        beforeEach(() => {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(true);
          }));
        });

        it('should redirect to continue game', done => {
          request.post(posturl(uri), (err, res) => {
            expect(res.statusCode).toEqual(302);
            expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
            done(err);
          });
        });
      });

      describe('when the player is not in the game', () => {
        beforeEach(() => {
          isPlayerInSave.returns(new Bluebird(function(resolve) {
            resolve(false);
          }));
        });

        describe('when the game is full', () => {
          beforeEach(() => {
            hasSpaceForPlayer.returns(new Bluebird(function(resolve) {
              resolve(false);
            }));
          });

          it('should redirect to continue game', done => {
            request.post(posturl(uri), (err, res) => {
              expect(res.statusCode).toEqual(302);
              expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/full');
              done(err);
            });
          });
        });

        describe('when the game is not full', () => {
          beforeEach(() => {
            hasSpaceForPlayer.returns(new Bluebird(function(resolve) {
              resolve(true);
            }));
          });

          describe('when the game is public-auto', () => {
            beforeEach(() => {
              saves.addPlayer.reset();
              isPublic.returns(new Bluebird(resolve => resolve(true)));
              isAutoAdd.returns(new Bluebird(resolve => resolve(true)));
            });

            it('should add the player to the game', done => {
              request.post(posturl(uri, {secret: 'correct'}), function (err) {
                expect(saves.addPlayer.firstCall.args[0]).toEqual('34242-324324');
                expect(saves.addPlayer.firstCall.args[1]).toEqual('p1234');
                done(err);
              });
            });

            it('should redirect to continue game', done => {
              request.post(posturl(uri), (err, res) => {
                expect(res.statusCode).toEqual(302);
                expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
                done(err);
              });
            });
          });

          describe('when the game is public-ask', () => {
            beforeEach(() => {
              saves.addPlayer.reset();
              isPublic.returns(new Bluebird(resolve => resolve(true)));
              isAutoAdd.returns(new Bluebird(resolve => resolve(false)));
            });

            it('should add the player to the game', done => {
              request.post(posturl(uri, {secret: 'correct'}), function (err) {
                expect(saves.addPlayer.firstCall.args[0]).toEqual('34242-324324');
                expect(saves.addPlayer.firstCall.args[1]).toEqual('p1234');
                done(err);
              });
            });

            it('should redirect to continue game', done => {
              request.post(posturl(uri), (err, res) => {
                expect(res.statusCode).toEqual(302);
                expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324');
                done(err);
              });
            });
          });

          describe('when the game is private', () => {
            beforeEach(() => {
              isPublic.returns(new Bluebird(function(resolve) {
                resolve(false);
              }));
            });

            describe('when no secret is supplied', () => {
              it('should return a 400', done => {
                request.post(posturl(uri, {}), (err, res) => {
                  expect(res.statusCode).toEqual(400);
                  done(err);
                });
              });
            });

            describe('when the secret is incorrect', () => {
              beforeEach(() => {
                isSecretCorrect.returns(new Bluebird(function(resolve) {
                  resolve(false);
                }));
              });

              it('should redirect to the join page', done => {
                request.post(posturl(uri, {secret: 'not-correct'}), (err, res) => {
                  expect(res.statusCode).toEqual(302);
                  expect(res.headers.location).toEqual('http://localhost:3000/saves/34242-324324/join');
                  done(err);
                });
              });
            });

            describe('when the secret is correct', () => {
              beforeEach(() => {
                saves.addPlayer.reset();
                isSecretCorrect.returns(new Bluebird(function(resolve) {
                  resolve(true);
                }));
              });

              it('should add the player to the game', done => {
                request.post(posturl(uri, {secret: 'correct'}), function (err) {
                  expect(saves.addPlayer.firstCall.args[0]).toEqual('34242-324324');
                  expect(saves.addPlayer.firstCall.args[1]).toEqual('p1234');
                  done(err);
                });
              });

              it('should redirect to continue game', done => {
                request.post(posturl(uri, {secret: 'correct'}), (err, res) => {
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