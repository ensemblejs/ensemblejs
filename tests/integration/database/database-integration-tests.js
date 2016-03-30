'use strict';

var expect = require('expect');
var sinon = require('sinon');
var logger = require('../../../src/logging/server/logger').logger;

var configGetter = require('../../../src/util/config');
var config = configGetter.get();
config.database.host = 'localhost';
config.database.port = 5984;
sinon.stub(configGetter, 'get').returns(config);
console.log(config);

let database = require('../../../src/util/database');
var on = require('../../fake/on');
var makeTestible = require('../../support').makeTestible;

describe('database integration', function () {
  var onServerStart;

  beforeEach(function () {
    sinon.spy(database, 'create');
    sinon.spy(logger, 'error');

    on.databaseReady.reset();

    var db = makeTestible('core/server/database-integration', {
      On: on
    });

    onServerStart = db[1].OnServerStart();
  });

  afterEach(function () {
    database.create.restore();
    logger.error.restore();
  });

  after(function () {
    configGetter.get.restore();
  });

  describe('when the server starts', function () {
    describe('when running locally', function () {
      beforeEach(function () {
        sinon.stub(database, 'isLocal').returns(true);
      });

      afterEach(function () {
        database.isLocal.restore();
      });

      describe('when the databases exist', function () {
        beforeEach(function (done) {
          database.create('devices')
            .then(() => database.create('players'))
            .then(() => database.create('saves_metadata'))
            .then(() => database.create('saves'))
            .then(() => database.create.reset())
            .then(() => onServerStart())
            .then(() => done());
        });

        afterEach(function (done) {
          database.destroy('devices')
            .then(database.destroy('players'))
            .then(database.destroy('saves_metadata'))
            .then(database.destroy('saves'))
            .then(() => done());
        });

        it('should emit an OnDatabaseReady event', function () {
          expect(on.databaseReady.called).toBe(true);
        });
      });

      describe('when the databases dont exist', function () {
        beforeEach(function (done) {
          onServerStart().then(() => done());
        });

        afterEach(function (done) {
          database.destroy('devices')
            .then(() => database.destroy('players'))
            .then(() => database.destroy('saves_metadata'))
            .then(() => database.destroy('saves'))
            .then(() => done());
        });

        it('should create the "saves" database', function () {
          expect(database.create.firstCall.args).toEqual(['saves']);
        });

        it('should create the "saves_metadata" database', function () {
          expect(database.create.secondCall.args).toEqual(['saves_metadata']);
        });

        it('should create the "players" database', function () {
          expect(database.create.thirdCall.args).toEqual(['players']);
        });

        it('should create the "devices" database', function () {
          expect(database.create.lastCall.args).toEqual(['devices']);
        });

        it('should emit an OnDatabaseReady event', function () {
          expect(on.databaseReady.called).toBe(true);
        });
      });
    });

    describe('when not running locally', function () {
      beforeEach(function () {
        sinon.stub(database, 'isLocal').returns(false);
      });

       afterEach(function () {
        database.isLocal.restore();
      });

      describe('when the databases exist', function () {
        beforeEach(function (done) {
          database.create('devices')
            .then(() => database.create('players'))
            .then(() => database.create('saves'))
            .then(() => database.create('saves_metadata'))
            .then(() => database.create.reset())
            .then(() => onServerStart())
            .then(() => done());
        });

        afterEach(function (done) {
          database.destroy('devices')
            .then(() => database.destroy('players'))
            .then(() => database.destroy('saves'))
            .then(() => database.destroy('saves_metadata'))
            .then(() => done());
        });

        it('should do nothing', function () {
          expect(database.create.called).toBe(false);
        });

        it('should emit an OnDatabaseReady event', function () {
          expect(on.databaseReady.called).toBe(true);
        });
      });

      describe('when the databases dont exist', function () {
        it('should report an error if no "devices" database exist', function (done) {

          onServerStart()
            .then(() => {
              expect(logger.error.firstCall.args).toEqual([
                {database: 'devices'}, 'Database does not exist.'
              ]);
            })
            .then(() => done())
            .catch(done);
        });

        it('should report an error if no "players" database exist', function (done) {
          database.create('devices')
            .then(() => onServerStart())
            .then(() => {
              expect(logger.error.firstCall.args).toEqual([
                {database: 'players'}, 'Database does not exist.'
              ]);
            })
            .then(() => database.destroy('devices'))
            .then(() => done())
            .catch(done);
        });

        it('should report an error if no "saves_metadata" database exist', function (done) {
          database.create('devices')
            .then(() => database.create('players'))
            .then(() => onServerStart())
            .then(() => {
              expect(logger.error.firstCall.args).toEqual([
                {database: 'saves_metadata'}, 'Database does not exist.'
              ]);
            })
            .then(() => database.destroy('players'))
            .then(() => database.destroy('devices'))
            .then(() => done())
            .catch(done);
        });

        it('should report an error if no "saves" database exist', function (done) {

          database.create('devices')
            .then(() => database.create('players'))
            .then(() => database.create('saves_metadata'))
            .then(() => onServerStart())
            .then(() => {
              expect(logger.error.lastCall.args).toEqual([
                {database: 'saves'}, 'Database does not exist.'
              ]);
            })
            .then(() => database.destroy('saves_metadata'))
            .then(() => database.destroy('players'))
            .then(() => database.destroy('devices'))
            .then(() => done())
            .catch(done);
        });

        it('should not emit an OnDatabaseReady event', function (done) {
          onServerStart()
            .then(() => {
              expect(on.databaseReady.called).toBe(false);
            })
            .then(() => done())
            .catch(done);
        });
      });
    });
  });
});