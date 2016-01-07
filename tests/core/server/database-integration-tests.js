'use strict';

var expect = require('expect');
var sinon = require('sinon');
var mongo = require('../../../src/util/mongo');
var logger = require('../../../src/logging/server/logger').logger;
var on = require('../../fake/on');
var time = require('../../fake/time').at(0);
var Bluebird = require('bluebird');
var makeTestible = require('../../support').makeTestible;
var saves = require('../../../src/util/models/saves');
var saveQueue = require('../../../src/util/save-queue');

describe('database integration', function () {

  var onServerStart;
  var onServerStop;
  var onDatabaseReady;

  beforeEach(function () {
    sinon.spy(mongo, 'disconnect');
    sinon.stub(mongo, 'isConnected').returns(true);
    sinon.spy(logger, 'error');
    sinon.stub(saves, 'save').returns(true);

    on.databaseReady.reset();

    var db = makeTestible('core/server/database-integration', {
      On: on,
      Time: time
    });

    onServerStart = db[1].OnServerStart();
    onServerStop = db[1].OnServerStop();
    onDatabaseReady = db[1].OnDatabaseReady();
  });

  afterEach(function () {
    mongo.disconnect.restore();
    mongo.isConnected.restore();
    logger.error.restore();
    saves.save.restore();
  });

  describe('when the server starts', function () {
    beforeEach(function (done) {

      sinon.stub(mongo, 'connect').returns(Bluebird.resolve());

      onServerStart().then(done);
    });

    afterEach(function () {
      mongo.connect.restore();
    });

    it('should connect to the database', function () {
      expect(mongo.connect.called).toBe(true);
    });

    it('should emit an OnDatabaseReady event', function () {
      expect(on.databaseReady.called).toBe(true);
    });

    it('should log errors', function (done) {
      mongo.connect.restore();

      sinon.stub(mongo, 'connect').returns(Bluebird.reject('Some error'));

      onServerStart()
        .finally(function () {
          expect(logger.error.called).toBe(true);
        })
        .finally(done);
    });
  });

  describe('when the database is ready', function () {
    beforeEach(function () {
      saves.save.reset();
      saveQueue.saveOrQueue({my: 'data'}, 15);
      onDatabaseReady();
    });

    it('should flush pending saves to the database', function () {
      expect(saves.save.firstCall.args).toEqual([{my: 'data'}, 15]);
    });
  });

  describe('when the server stops', function () {
    beforeEach(function (done) {
      saves.save.reset();
      saveQueue.saveOrQueue({my: 'dataz'}, 35);
      onServerStop().then(done).catch(done);
    });

    it('should flush pending saves to the database', function () {
      expect(saves.save.firstCall.args).toEqual([{my: 'dataz'}, 35]);
    });

    it('should close the connection to the database', function () {
      expect(mongo.disconnect.called).toBe(true);
    });
  });
});