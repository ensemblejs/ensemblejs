'use strict';

var expect = require('expect');
var sinon = require('sinon');
var Bluebird = require('bluebird');
var request = require('request');
var makeTestible = require('../../support').makeTestible;
var url = require('../../route-testing').url;
var log = require('../../route-testing').log;
var fakeConfig = require('../../fake/config');
var saves = require('../../../src/util/models/saves');

describe('debug routes', function () {
  var onServerStart;
  var onServerStop;

  describe('/saves/:saveId/data', function () {
    describe('when debug enabled', function () {
      beforeEach(function() {
        fakeConfig.stub({
          debug: {
            develop: true
          },
          logging: {
            expressBunyanLogger: {
              excludes: []
            }
          }
        });

        var routes = makeTestible('routes/server/debug-routes');
        sinon.stub(saves, 'get').returns(new Bluebird(function(resolve) {
          resolve({ some: 'state' });
        }));

        var sut = makeTestible('core/server/web-server', {
          Routes: [routes[0]]
        });

        onServerStart = sut[0];
        onServerStop = sut[1].OnServerStop();

        onServerStart('../dummy', ['game']);
      });

      afterEach(function () {
        saves.get.restore();
        onServerStop();
        fakeConfig.restore();
      });

      it('should return the state of the game', function (done) {
        request(url('/saves/1234/data'), function (err, res) {
          log(err);

          expect(res.statusCode).toEqual(200);
          expect(saves.get.firstCall.args[0]).toEqual('1234');
          expect(JSON.parse(res.body)).toEqual({ some: 'state'});
          done();
        }).end();
      });
    });

    describe('when debug disabled', function () {
      beforeEach(function() {
        fakeConfig.stub();

        var routes = makeTestible('routes/server/config-routes');
        var sut = makeTestible('core/server/web-server', {
          Routes: [routes[0]]
        });

        onServerStart = sut[0];
        onServerStop = sut[1].OnServerStop();

        onServerStart('/dummy', ['game']);
      });

      afterEach(function () {
        onServerStop();
        fakeConfig.restore();
      });

      it('should respond with a 404', function (done) {
        request(url('/saves/1234/data'), function (err, res) {
          log(err);

          expect(res.statusCode).toEqual(404);
          done();
        }).end();
      });
    });
  });
});