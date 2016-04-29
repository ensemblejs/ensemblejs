'use strict';

var expect = require('expect');
var sinon = require('sinon');
var makeTestible = require('../support').makeTestible;
var logger = require('../../src/logging/server/logger').logger;

function empty () {}

describe('trigger map validator test', () => {
  function makeValidator(map) {
    return makeTestible('validators/shared/trigger-map', {
      TriggerMap: [map],
      Logger: logger
    })[1];
  }

  beforeEach(() => {
    sinon.spy(logger, 'error');
  });

  afterEach(() => {
    logger.error.restore();
  });

  it('runs on server start', () => {
    expect(makeValidator({}).OnServerStart).toNotBe(undefined);
  });

  it('runs on client start', () => {
    expect(makeValidator({}).OnClientStart).toNotBe(undefined);
  });

  describe('when there are no trigger maps', () => {
    beforeEach(function ()  {
      var validator = makeValidator([]);
      validator.OnServerStart()();
    });

    it('should do nothing', () => {
      expect(logger.error.called).toBe(false);
    });
  });

  describe('when there are trigger maps', () => {
    beforeEach(function ()  {
      logger.error.reset();
    });

    it('should ensure every key becomes an array', () => {
      var map = ['*', {'key': {when: 'something', call: sinon.spy()}}];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(map.key).toBeAn(Array);
      expect(logger.error.callCount).toEqual(0);
    });

    it('should require at least one entry per array', () => {
      var map = ['*', {'key': []}];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(logger.error.firstCall.args).toEqual([{key: 'key'}, 'Trigger Map entry must have at least one entry.']);
      expect(logger.error.callCount).toEqual(1);
    });

    it('should require a when property', () => {
      var map = ['*', { 'key': { call: sinon.spy() } }];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(logger.error.firstCall.args).toEqual([{key: 'key'}, 'Trigger Map entry must have a "when" property.']);
      expect(logger.error.callCount).toEqual(1);
    });

    it('should add eq: true to all maps without a condition', () => {
      var map = ['*', { 'key': { when: 'something', call: sinon.spy() } }];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(map.key[0].eq).toNotBe(undefined);
    });

    it('should not add eq: true when there is another condition', () => {
      var map = ['*', {
        'onChangeOf': { when: 'something', onChangeOf: sinon.spy() },
        'onElementAdded': { when: 'something', onElementAdded: sinon.spy() },
        'onElementRemoved': { when: 'something', onElementRemoved: sinon.spy() },
        'onElementChanged': { when: 'something', onElementChanged: sinon.spy() },
        'lt': { when: 'something', lt: false, call: sinon.spy() },
        'lte': { when: 'something', lte: false, call: sinon.spy() },
        'gt': { when: 'something', gt: false, call: sinon.spy() },
        'gte': { when: 'something', gte: false, call: sinon.spy() },
        'eq': { when: 'something', eq: false, call: sinon.spy() }
      }];

      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(map.onChangeOf[0].eq).toBe(undefined);
      expect(map.onElementAdded[0].eq).toBe(undefined);
      expect(map.onElementChanged[0].eq).toBe(undefined);
      expect(map.onElementRemoved[0].eq).toBe(undefined);
      expect(map.lt[0].eq).toBe(undefined);
      expect(map.lte[0].eq).toBe(undefined);
      expect(map.gt[0].eq).toBe(undefined);
      expect(map.gte[0].eq).toBe(undefined);
      expect(map.eq[0].eq).toBe(false);
    })

    it('should require at least one callback', () => {
      var map = ['*', {
        'noCallback': { when: 'something' }
      }];

      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(logger.error.firstCall.args).toEqual([{key: 'noCallback'}, 'Trigger Map requires at least one callback: ["call", "onChangeOf", "onElementAdded", "onElementChanged", "onElementRemoved"] property.']);
      expect(logger.error.callCount).toEqual(1);
    });

    it('should convert all call properties to arrays', () => {
      var map = ['*', { 'key': { when: 'something', call: sinon.spy() } }];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(map.key[0].call).toBeAn(Array);
    });

    it('should convert all onChangeOf properties to arrays', () => {
      var map = ['*', { 'key': { when: 'something', onChangeOf: sinon.spy() } }];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(map.key[0].onChangeOf).toBeAn(Array);
    });

    it('should convert all onElementAdded properties to arrays', () => {
      var map = ['*', { 'key': { when: 'something', onElementAdded: sinon.spy() } }];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(map.key[0].onElementAdded).toBeAn(Array);
    });

    it('should convert all onElementRemoved properties to arrays', () => {
      var map = ['*', { 'key': { when: 'something', onElementRemoved: sinon.spy() } }];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(map.key[0].onElementRemoved).toBeAn(Array);
    });

    it('should convert all onElementChanged properties to arrays', () => {
      var map = ['*', { 'key': { when: 'something', onElementChanged: sinon.spy() } }];
      var validator = makeValidator(map);
      validator.OnServerStart()();

      expect(map.key[0].onElementChanged).toBeAn(Array);
    });
  });
});