'use strict';

var expect = require('expect');
var sinon = require('sinon');
var request = require('request');
var makeTestible = require('../../support').makeTestible;
var url = require('../../route-testing').url;
var config = require('../../../src/util/config');

var savePlayers = require('../../../src/util/models/players-in-save');

describe('player routes', function () {
  var onServerStart;
  var onServerStop;

  describe('/players/:playerId/saves', function () {
    var opts;
    var getSaves;
    var configStub;

    beforeEach(function() {
      configStub = sinon.stub(config, 'get').returns({
        debug: {
          develop: false
        },
        logging: {
          expressBunyanLogger: {
            excludes: []
          }
        }
      });

      getSaves = sinon.stub(savePlayers, 'getByGameAndPlayer');
      getSaves.returns([
        {saveId: 1, gameId: 'distributedlife+tetris', playerId: 1234},
        {saveId: 2, gameId: 'distributedlife+pong', playerId: 1234}
      ]);

      var routes = makeTestible('routes/server/player-routes');
      var sut = makeTestible('core/server/web-server', {
        Routes: [routes[0]]
      });

      onServerStart = sut[0];
      onServerStop = sut[1].OnServerStop();

      onServerStart('../dummy', {
        id: 'distributedlife+pong',
        name: 'Pong',
        modes: ['game']
      });

      opts = url('/players/1234/saves');
      opts.headers = {
        'Accept': 'application/json'
      };
    });

    afterEach(function () {
      getSaves.restore();
      configStub.restore();
      onServerStop();
    });

    it('should return the player\'s saves', function (done) {
      request(opts, function (err, res) {
        expect(res.statusCode).toEqual(200);
        expect(savePlayers.getByGameAndPlayer.firstCall.args[0]).toEqual('distributedlife+pong');
        expect(savePlayers.getByGameAndPlayer.firstCall.args[1]).toEqual('1234');
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