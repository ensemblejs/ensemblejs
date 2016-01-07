'use strict';

var expect = require('expect');
var sinon = require('sinon');
var Bluebird = require('bluebird');
var request = require('request');
var makeTestible = require('../../support').makeTestible;
var url = require('../../route-testing').url;
var config = require('../../../src/util/config');
var saves = require('../../../src/util/models/saves');

describe('debug routes', function () {
  var onServerStart;
  var onServerStop;

  describe('/saves/:saveId/data', function () {
    describe('when debug enabled', function () {
      beforeEach(function() {
        sinon.stub(config, 'get').returns({
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
        sinon.stub(saves, 'getById').returns(new Bluebird(function(resolve) {
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
        saves.getById.restore();
        config.get.restore();
        onServerStop();
      });

      it('should return the state of the game', function (done) {
        request(url('/saves/1234/data'), function (err, res) {
          expect(res.statusCode).toEqual(200);
          expect(saves.getById.firstCall.args[0]).toEqual('1234');
          expect(JSON.parse(res.body)).toEqual({ some: 'state'});
          done(err);
        }).end();
      });
    });

    describe('when debug disabled', function () {
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

        var routes = makeTestible('routes/server/config-routes');
        var sut = makeTestible('core/server/web-server', {
          Routes: [routes[0]]
        });

        onServerStart = sut[0];
        onServerStop = sut[1].OnServerStop();

        onServerStart('/dummy', ['game']);
      });

      afterEach(function () {
        config.get.restore();
        onServerStop();
      });

      it('should respond with a 404', function (done) {
        request(url('/saves/1234/data'), function (err, res) {
          expect(res.statusCode).toEqual(404);
          done(err);
        }).end();
      });
    });
  });
});