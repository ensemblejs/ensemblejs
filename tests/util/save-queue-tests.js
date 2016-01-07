'use strict';

var expect = require('expect');
var Bluebird = require('bluebird');
var sinon = require('sinon');
var saveQueue = require('../../src/util/save-queue');
var mongo = require('../../src/util/mongo');
var saves = require('../../src/util/models/saves');

describe('the save queue', function () {
  describe('save or queue / cake or death', function () {
    beforeEach(function () {
      sinon.stub(saves, 'save').returns(Bluebird.resolve());
    });

    afterEach(function () {
      saves.save.restore();
    });

    describe('when not connected to the database', function () {
      beforeEach(function () {
        sinon.stub(mongo, 'isConnected').returns(false);

        saveQueue.saveOrQueue({ensemble: {saveId: 4}}, 5);
      });

      afterEach(function () {
        mongo.isConnected.restore();
      });

      it('should queue the save', function () {
        expect(saves.save.called).toBe(false);

        mongo.isConnected.restore();
        sinon.stub(mongo, 'isConnected').returns(true);
        saveQueue.flushPendingSaves(6);

        expect(saves.save.called).toBe(true);
        expect(saves.save.firstCall.args).toEqual([{ensemble: {saveId: 4}}, 6]);
      });
    });

    describe('when connected to the database', function () {
      beforeEach(function () {
        sinon.stub(mongo, 'isConnected').returns(true);

        saveQueue.saveOrQueue({ensemble: {saveId: 4}}, 5);
      });

      afterEach(function () {
        mongo.isConnected.restore();
      });

      it('should save the record', function () {
        expect(saves.save.firstCall.args).toEqual([{ensemble: {saveId: 4}}, 5]);
      });
    });
  });

  describe('flush pending saves', function () {
    beforeEach(function () {
      sinon.stub(mongo, 'isConnected').returns(false);
      sinon.stub(saves, 'save').returns(Bluebird.resolve(1));

      saveQueue.saveOrQueue({ensemble: {saveId: 4}}, 5);
      saveQueue.saveOrQueue({ensemble: {saveId: 5}}, 6);

      mongo.isConnected.restore();
    });

    afterEach(function () {
      sinon.stub(mongo, 'isConnected').returns(true);

      saveQueue.flushPendingSaves(1);

      saves.save.restore();
      mongo.isConnected.restore();
    });

    describe('when not connected to the database', function () {
      var result;

      beforeEach(function () {
        sinon.stub(mongo, 'isConnected').returns(false);

        result = saveQueue.flushPendingSaves(19);
      });

      afterEach(function () {
        mongo.isConnected.restore();
      });

      it('should queue each save', function () {
        expect(saves.save.called).toBe(false);

        mongo.isConnected.restore();
        sinon.stub(mongo, 'isConnected').returns(true);

        saveQueue.flushPendingSaves(6);

        expect(saves.save.called).toBe(true);
        expect(saves.save.firstCall.args).toEqual([{ensemble: {saveId: 4}}, 6]);
        expect(saves.save.secondCall.args).toEqual([{ensemble: {saveId: 5}}, 6]);
      });

      it('should return a promise with the result', function (done) {
        result.then(function (results) {
          expect(results).toEqual([false, false]);
        }).then(done).catch(done);
      });
    });

    describe('when connected to the database', function () {
      var result;

      beforeEach(function () {
        sinon.stub(mongo, 'isConnected').returns(true);

        result = saveQueue.flushPendingSaves(19);
      });

      afterEach(function () {
        mongo.isConnected.restore();
      });

      it('should save each record', function () {
        expect(saves.save.firstCall.args).toEqual([{ensemble: {saveId: 4}}, 19]);
        expect(saves.save.secondCall.args).toEqual([{ensemble: {saveId: 5}}, 19]);
      });

      it('should return a promise with the result', function (done) {
        result.then(function (results) {
          expect(results).toEqual([1, 1]);
        }).then(done).catch(done);
      });
    });
  });
});