'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../support').makeTestible;
var logger = require('../../src/logging/server/logger').logger;

function empty () {}

describe('ack map validator test', function () {
  var validator;

  beforeEach(function () {
    sinon.spy(logger, 'error');
  });

  afterEach(function () {
    logger.error.restore();
  });

  it('runs on server start', function () {
    expect(require('../../src/validators/server/ack-maps').type).toEqual('OnServerStart');
  });

  describe('when there are no ack maps', function () {
    beforeEach(function ()  {
      validator = makeTestible('validators/server/ack-maps', {
        AcknowledgementMap: [],
        Logger: logger
      });

      validator[0]();
    });

    it('should do nothing', function () {
      expect(logger.error.called).toBe(false);
    });
  });

  describe('when there are ack maps', function () {
    var maps = [{
      'missingTarget': [{ type: 'every'}],
      'missingType': [{ onComplete: empty}],
      'invalidType': [{ onComplete: empty, type: 'derp'}]
    }, {
      'notAnArray': { onComplete: empty, type: 'once-for-all'},
      'validAll': [{onComplete: empty, type: 'once-each' }],
      'validOne': [{onComplete: empty, type: 'first-only' }]
    }, [
    'withMode', {
      'invalid': [{ type: 'every '}]
    } ],
    {
      'progressOnceForall': [{onComplete: empty, type: 'once-for-all', onProgress: empty}],
      'progressOnceEach': [{onComplete: empty, type: 'once-each', onProgress: empty}],
      'progressFirstOnly': [{onComplete: empty, type: 'first-only', onProgress: empty}],
      'progressEvery': [{onComplete: empty, type: 'every', onProgress: empty}]
    }
    ];

    beforeEach(function ()  {
      validator = makeTestible('validators/server/ack-maps', {
        AcknowledgementMap: maps,
        Logger: logger
      });

      logger.error.reset();

      validator[0]();
    });

    it('should report errors for maps without onComplete handlers', function () {
      expect(logger.error.firstCall.args).toEqual([{key: 'missingTarget', property: 'onComplete'}, 'AcknowledgementMap missing property']);
    });

    it('should report errors for maps without types', function () {
      expect(logger.error.secondCall.args).toEqual([{key: 'missingType'}, 'AcknowledgementMap missing "type" property']);
    });

    it('should report errors for maps without valid types', function () {
      expect(logger.error.thirdCall.args).toEqual([{key: 'invalidType', property: 'derp'}, 'AcknowledgementMap has invalid "type" property']);
    });

    it('should convert non-arrays to arrays', function () {
      expect(maps[1].notAnArray).toBeAn(Array);
    });

    it('should support action maps with modes', function () {
      expect(logger.error.getCall(3).args).toEqual([{key: 'invalid', property: 'onComplete'}, 'AcknowledgementMap missing property']);
    });

    it('should only allow onProgress on once-for-all type', function () {
      expect(logger.error.getCall(5).args).toEqual([{key: 'progressOnceEach', property: 'onProgress'}, 'AcknowledgementMap can\'t use property']);
      expect(logger.error.getCall(6).args).toEqual([{key: 'progressFirstOnly', property: 'onProgress'}, 'AcknowledgementMap can\'t use property']);
      expect(logger.error.getCall(7).args).toEqual([{key: 'progressEvery', property: 'onProgress'}, 'AcknowledgementMap can\'t use property']);
    });
  });
});