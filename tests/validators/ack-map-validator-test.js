'use strict';

var expect = require('expect');
var makeTestible = require('../support').makeTestible;
var logger = require('../fake/logger');

function empty () {}

describe('ack map validator test', function () {
  var validator;

  beforeEach(function () {
    logger.error.reset();
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
      'missingTarget': [{ type: 'one'}],
      'missingType': [{ onComplete: empty}],
      'invalidType': [{ onComplete: empty, type: 'derp'}]
    }, {
      'notAnArray': { onComplete: empty, type: 'one'},
      'validAll': [{onComplete: empty, type: 'all' }],
      'validOne': [{onComplete: empty, type: 'one' }]
    }, [
    'withMode', {
      'invalid': [{ type: 'one '}]
    }
    ]];

    beforeEach(function ()  {
      validator = makeTestible('validators/server/ack-maps', {
        AcknowledgementMap: maps,
        Logger: logger
      });

      validator[0]();
    });

    it('should report errors for maps without onComplete handlers', function () {
      expect(logger.error.getCall(0).args).toEqual(['AcknowledgementMap "missingTarget" missing "onComplete" property']);
    });

    it('should report errors for maps without types', function () {
      expect(logger.error.getCall(1).args).toEqual(['AcknowledgementMap "missingType" missing "type" property']);
    });

    it('should report errors for maps without valid types', function () {
      expect(logger.error.getCall(2).args).toEqual(['AcknowledgementMap "invalidType" has invalid "type" property of "derp"']);
    });

    it('should convert non-arrays to arrays', function () {
      expect(maps[1].notAnArray).toBeAn(Array);
    });

    it('should support action maps with modes', function () {
      expect(logger.error.getCall(3).args).toEqual(['AcknowledgementMap "invalid" missing "onComplete" property']);
    });
  });
});