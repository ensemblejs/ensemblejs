'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../../support').makeTestible;

describe('config routes', function () {
  var onServerStart;
  var onServerStop;

  function url (path) {
    return ['http://localhost:3000', path].join('');
  }

  function log (err) {
    if (!err) {
      return;
    }

    console.error(err);
  }

  before(function() {
    var config = require('../../../src/util/config');
    config. get = function () {
      return {
        logging: {
          expressBunyanLogger: {
            excludes: []
          }
        }
      };
    };

    var routes = makeTestible('routes/server/config-routes');
    var sut = makeTestible('core/server/web-server', {
      SocketServer: {
        start: sinon.spy(),
        stop: sinon.spy()
      },
      Routes: [routes[0]],
      WebServiceMiddleware: []
    });

    onServerStart = sut[0];
    onServerStop = sut[1].OnServerStop();
  });

  describe('get /config', function () {
    before(function () {
      onServerStart('../dummy', {modes: ['game']});
    });

    after(function () {
      onServerStop();
    });

    it('should return the config', function (done) {
      request.get(url('/config'), function (err, res) {
        log(err);

        expect(res.statusCode).toEqual(200);

        var json = JSON.parse(res.body);
        expect(json).toEqual({
          logging: {
            expressBunyanLogger: {
              excludes: []
            }
          }
        });
        done();
      }).end();
    });
  });
});