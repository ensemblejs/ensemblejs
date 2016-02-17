'use strict';

var expect = require('expect');
var sinon = require('sinon');
import * as database from '../../../src/util/database';
import {bootstrap, strapboot} from 'ensemblejs-couch-bootstrap';
var players = require('../../../src/util/models/players');
var request = require('request');
var makeTestible = require('../../support').makeTestible;
var url = require('../../route-testing').url;
var config = require('src/util/config');
var posturl = require('../../route-testing').posturl;

describe('/device/move', function () {
  var onServerStart;
  var onServerStop;

  var rawStateAccess = {
    for: function () { return { some: 'state' }; }
  };

  beforeEach(done => {
    bootstrap(database)
      .then(() => database.store('players', { id: 'p1234', deviceIds: ['d1234'] }))
      .then(() => database.store('players', { id: 'p2', deviceIds: ['d2'] }))
      .then(() => done());
  });

  afterEach(done => {
    strapboot(database)
      .then(() => done());
  });

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

    it('should add the device over to the new player', done => {
      request.post(posturl('/device/move', {toPlayer: 'p2'}), function (err, res) {
        expect(res.statusCode).toEqual(302);

        players.getById('p2')
          .then(player => expect(player.deviceIds).toEqual(['d2', 'd1234']))
          .then(() => done(err))
          .catch(done);
      });
    });

    it('should from the device from the original player', done => {
      request.post(posturl('/device/move', {toPlayer: 'p2'}), function (err, res) {
        expect(res.statusCode).toEqual(302);

        players.getById('p1234')
          .then(player => expect(player.deviceIds).toEqual([]))
          .then(() => done(err))
          .catch(done);
      });
    });

    it('should reload the page', done => {
      request.post(posturl('/device/move', {toPlayer: 'p2'}), function (err, res) {
        expect(res.statusCode).toEqual(302);
        expect(res.headers.location).toEqual('/');
        done(err);
      });
    });

    describe('when the device cannot be found', function () {
      beforeEach(done => {
        database.remove('players', 'p1234')
        .then(() => database.store('players', { id: 'p1234', deviceIds: []}))
        .then(() => done());
      });

      afterEach(done => {
        database.store('players', { id: 'p1234', deviceIds: ['d1234']})
        .then(() => done());
      });

      it('should add the device over to the new player', done => {
        request.post(posturl('/device/move', {toPlayer: 'p2'}), function (err, res) {
          expect(res.statusCode).toEqual(302);

          players.getById('p2')
            .then(player => expect(player.deviceIds).toEqual(['d2', 'd1234']))
            .then(() => done(err))
            .catch(done);
        });
      });
    });

    describe('when the fromPlayer cannot be found', function () {
      beforeEach(done => {
        database.remove('players', 'p1234')
        .then(() => done());
      });

      afterEach(done => {
        database.store('players', { id: 'p1234', deviceIds: ['d1234']})
        .then(() => done());
      });

      it('should return a 400', done => {
        return request.post(posturl('/device/move', {toPlayer: 'p2'}), function (err,res) {

          expect(res.statusCode).toEqual(400);
          done(err);
        });
      });
    });

    it('should return a 400 if the toPlayer is not supplied', done => {
      request.post(posturl('/device/move'), function (err, res) {
        expect(res.statusCode).toEqual(400);
        done(err);
      });
    });

    it('should return a 400 if the toPlayer does not exist', done => {
      request.post(posturl('/device/move', {toPlayer: 'p3'}), function (err, res) {
        expect(res.statusCode).toEqual(400);
        done(err);
      });
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
      request(url('/device/move'), function (err, res) {
        expect(res.statusCode).toEqual(404);
        done(err);
      }).end();
    });
  });
});