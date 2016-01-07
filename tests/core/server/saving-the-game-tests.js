'use strict';

var expect = require('expect');
var sinon = require('sinon');
var mongo = require('../../../src/util/mongo');
var config = require('../../../src/util/config');
var logger = require('../../../src/logging/server/logger').logger;
var time = require('../../fake/time').at(0);
var makeTestible = require('../../support').makeTestible;
var saveQueue = require('../../../src/util/save-queue');

describe('continual saving', function () {
  var onSaveReady;
  var afterPhysicsFrame;

  var rawStateAccess = {
    for: sinon.stub().returns({my: 'game'})
  };

  beforeEach(function () {
    sinon.stub(mongo, 'isConnected').returns(true);
    sinon.spy(logger, 'error');
    sinon.stub(saveQueue, 'saveOrQueue').returns(true);

    var db = makeTestible('core/server/continual-save', {
      RawStateAccess: rawStateAccess,
      Time: time
    });

    onSaveReady = db[1].OnSaveReady();
    afterPhysicsFrame = db[1].AfterPhysicsFrame();
  });

  afterEach(function () {
    mongo.isConnected.restore();
    logger.error.restore();
    saveQueue.saveOrQueue.restore();
  });

  describe('when a game is ready', function () {
    beforeEach(function () {
      onSaveReady({id: 1});
    });

    it('should save an initial copy of the game', function () {
      expect(saveQueue.saveOrQueue.firstCall.args).toEqual([{my: 'game'}, 0]);
    });
  });

  describe('after each physics frame', function () {
    describe('autosave behaviour of "persistent"', function () {
      beforeEach(function () {
        sinon.stub(config, 'get').returns({
          ensemble: {
            autoSaveBehaviour: 'persistent'
          }
        });

        var db = makeTestible('core/server/continual-save', {
          RawStateAccess: rawStateAccess,
          Time: time
        });

        afterPhysicsFrame = db[1].AfterPhysicsFrame();
        afterPhysicsFrame({ get: sinon.stub().returns(1) });
      });

      afterEach(function () {
        config.get.restore();
      });

      it('should not save the game', function () {
        expect(saveQueue.saveOrQueue.firstCall.args).toEqual([{my: 'game'}, 0]);
      });
    });

    describe('autosave behaviour of "ephemeral"', function () {
      beforeEach(function () {
        sinon.stub(config, 'get').returns({
          ensemble: {
            autoSaveBehaviour: 'ephemeral'
          }
        });

        var db = makeTestible('core/server/continual-save', {
          RawStateAccess: rawStateAccess,
          Time: time
        });

        afterPhysicsFrame = db[1].AfterPhysicsFrame();
        afterPhysicsFrame({ get: sinon.stub().returns(1) });
      });

      afterEach(function () {
        config.get.restore();
      });

      it('should not save the game', function () {
        expect(saveQueue.saveOrQueue.firstCall.args).toEqual([{my: 'game'}, 0]);
      });
    });

    describe('othere autosave behaviours', function () {
      beforeEach(function () {
        sinon.stub(config, 'get').returns({
          ensemble: {
            autoSaveBehaviour: 'other'
          },
          nothing: function () {}
        });

        var db = makeTestible('core/server/continual-save', {
          RawStateAccess: rawStateAccess,
          Time: time
        });

        afterPhysicsFrame = db[1].AfterPhysicsFrame();
        afterPhysicsFrame({ get: sinon.stub().returns(1) });
      });

      afterEach(function () {
        config.get.restore();
      });

      it('should save the game', function () {
        expect(saveQueue.saveOrQueue.called).toEqual(false);
      });
    });
  });
});