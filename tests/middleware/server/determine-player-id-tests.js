'use strict';

var expect = require('expect');
var sinon = require('sinon');
var mongo = require('../../../src/util/mongo');
var playersStore = require('../../../src/util/models/players');
var config = require('../../../src/util/config');

var makeTestible = require('../../support').makeTestible;
var time = require('../../fake/time').at(15);

describe('determining the player id', function () {
  var middleware;

  beforeEach(function (done) {
    middleware = makeTestible('middleware/server/determine-player-id', {
      UUID: { gen: function () { return '1234'; }},
      Time: time
    })[0];

    mongo
      .connect(config.get().mongo.endpoint)
      .then(function () {
        return mongo.removeAll('players');
      })
      .finally(done);
  });

  afterEach(function () {
    mongo.disconnect();
  });

  describe('the session does not exist in players collection', function () {
    var req = {
      sessionID: '5678'
    };
    var res = {};

    beforeEach(function (done) {
      sinon.spy(playersStore, 'getByKey');
      sinon.spy(playersStore, 'save');
      sinon.spy(playersStore, 'getById');

      middleware(req, res, done);
    });

    afterEach(function () {
      playersStore.save.restore();
      playersStore.getByKey.restore();
      playersStore.getById.restore();
    });

    it('should create a new player record', function () {
      expect(playersStore.save.firstCall.args).toEqual([
        {_id: '1234', name: '1234', key: '5678', keyType: 'sessionId', updated: 15}, 15
      ]);
    });

    it('should set the req.player object', function () {
      expect(req.player).toEqual({_id: '1234', name: '1234', key: '5678', keyType: 'sessionId', updated: 15});
    });
  });

  describe('the session exists in players collection', function () {
    var req = {
      sessionID: '5678'
    };
    var res = {};

    beforeEach(function (done) {
      mongo.store('players', {
        _id: '9012',
        name: '9012',
        key: '5678',
        keyType: 'sessionId',
        updated: 10
      })
      .then(function () {
        sinon.spy(playersStore, 'getByKey');
        sinon.spy(playersStore, 'save');
        sinon.spy(playersStore, 'getById');

        middleware(req, res, done);
      });
    });

    afterEach(function () {
      playersStore.save.restore();
      playersStore.getByKey.restore();
      playersStore.getById.restore();
    });

    it('should set the req.player object', function () {
      expect(req.player).toEqual({_id: '9012', name: '9012', key: '5678', keyType: 'sessionId', updated: 10});
    });
  });
});