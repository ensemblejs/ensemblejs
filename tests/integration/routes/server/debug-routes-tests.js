'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../../../support').makeTestible;
var url = require('../../../route-testing').url;
var config = require('../../../../src/util/config');

describe('debug routes', function () {
  var onServerStart;
  var onServerStop;

  var rawStateAccess = {
    for: function () { return { some: 'state' }; }
  };

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

        var routes = makeTestible('routes/server/debug-routes', {
          RawStateAccess: rawStateAccess
        });
        sinon.spy(rawStateAccess, 'for');

        var sut = makeTestible('core/server/web-server', {
          Routes: [routes[0]]
        });

        onServerStart = sut[0];
        onServerStop = sut[1].OnServerStop();

        onServerStart('../dummy', ['game']);
      });

      afterEach(function () {
        rawStateAccess.for.restore();
        config.get.restore();
        onServerStop();
      });

      it('should return the state of the game', function (done) {
        request(url('/saves/1234/data'), function (err, res) {
          expect(res.statusCode).toEqual(200);
          expect(rawStateAccess.for.firstCall.args[0]).toEqual('1234');
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