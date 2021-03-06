'use strict';

const expect = require('expect');
const sinon = require('sinon');
const makeTestible = require('../support').makeTestible;
const logger = require('../../src/logging/server/logger').logger;
const capture = require('../support').capture();
const empty = () => undefined;

describe('action map validator', function () {
  function makeValidator(maps = []) {
    capture.reset();

    makeTestible('validators/shared/action-map', {
      ActionMap: maps,
      DefinePlugin: capture.define,
      Logger: logger
    });

    return capture.deps();
  }

  it('runs on server start', function () {
    expect(makeValidator().OnServerStart).toNotBe(undefined);
  });

  it('runs on client start', function () {
    expect(makeValidator().OnClientStart).toNotBe(undefined);
  });

  describe('when there are no action maps', function () {
    beforeEach(function ()  {
      sinon.spy(logger, 'error');

      const validator = makeValidator()
      validator.OnServerStart()();
    });

    afterEach(function () {
      logger.error.restore();
    });

    it('should do nothing', function () {
      expect(logger.error.called).toBe(false);
    });
  });

  describe('when there are ack maps', function () {
    const maps = [{
      'missingTarget': [{}],
      'tab': [
        {call: empty, modifiers: ['ctrl']},
        {call: empty, modifiers: ['ctrl', 'shift']}
      ]
    }, {
      'notAnArray': { call: empty },
      'valid': [{call: empty}],
      'alsoValid': [{ack: 'banana'}],
      'nothing': [{ack: 'alpha'}],
      'mouse': [{ack: 'alpha'}]
    },
    [
      'withMode', {
        'invalid': [ {} ],
        'valid': [ {call: empty} ]
      }
    ]
    ];

    beforeEach(function ()  {
      sinon.spy(logger, 'error');

      const validator = makeValidator(maps)
      validator.OnServerStart()();
    });

    afterEach(function () {
      logger.error.restore();
    });

    it('should report errors for maps without a target', function () {
      expect(logger.error.getCall(0).args).toEqual([{key: 'missingTarget'}, 'ActionMap missing "call" or "ack" property']);
    });

    it('should report errors for ctrl+tab', function () {
      expect(logger.error.getCall(1).args).toEqual([{key: 'tab'}, 'ActionMap "tab" has "ctrl" modifier. This is not supported']);
    });

    it('should report errors for ctrl+shift+tab', function () {
      expect(logger.error.getCall(2).args).toEqual([{key: 'tab'}, 'ActionMap "tab" has "ctrl+shift" modifier. This is not supported']);
    });

    it('should convert non-arrays to arrays', function () {
      expect(maps[1].notAnArray).toBeAn(Array);
    });

    it('should convert "call" keys into arrays', () => {
      console.log(maps[1].notAnArray[0].call[0]);
      expect(maps[1].notAnArray[0].call).toBeAn(Array);
    })

    it('should report an error when nothing has an ack', function () {
      expect(logger.error.getCall(3).args).toEqual([{key: 'nothing'}, 'ActionMap cannot use the "ack" property']);
    });

    it('should report an error when mouse has an ack', function () {
      expect(logger.error.getCall(4).args).toEqual([{key: 'mouse'}, 'ActionMap cannot use the "ack" property']);
    });

    it('should support action maps with modes', function () {
      expect(logger.error.getCall(5).args).toEqual([{key: 'invalid'}, 'ActionMap missing "call" or "ack" property']);
    });
  });
});