'use strict';

var expect = require('expect');
var makeTestible = require('../support').makeTestible;
var logger = require('../fake/logger');
function empty () {}

describe('action map validator', function () {
  var validator;

  it('runs on server start', function () {
    expect(require('../../src/validators/server/action-map').type).toEqual('OnServerStart');
  });

  describe('when there are no action maps', function () {
    beforeEach(function ()  {
      validator = makeTestible('validators/server/action-map', {
        ActionMap: [],
        Logger: logger
      });

      logger.error.reset();

      validator[0]();
    });

    it('should do nothing', function () {
      expect(logger.error.called).toBe(false);
    });
  });

  describe('when there are ack maps', function () {
    var maps = [{
      'missingTarget': [{}],
      'tab': [
        {target: empty, modifiers: ['ctrl']},
        {target: empty, modifiers: ['ctrl', 'shift']}
      ]
    }, {
      'notAnArray': { target: empty },
      'valid': [{target: empty}]
    },
    [
      'withMode', {
        'invalid': [ {} ],
        'valid': [ {target: empty} ]
      }
    ]
    ];

    beforeEach(function ()  {
      validator = makeTestible('validators/server/action-map', {
        ActionMap: maps,
        Logger: logger
      });

      logger.error.reset();

      validator[0]();
    });

    it('should report errors for maps without targets', function () {
      expect(logger.error.getCall(0).args).toEqual(['ActionMap "missingTarget" missing "target" property']);
    });

    it('should report errors for ctrl+tab', function () {
      expect(logger.error.getCall(1).args).toEqual(['ActionMap "tab" has "ctrl" modifier. This is not supported']);
    });

    it('should report errors for ctrl+shift+tab', function () {
      expect(logger.error.getCall(2).args).toEqual(['ActionMap "tab" has "ctrl+shift" modifier. This is not supported']);
    });

    it('should convert non-arrays to arrays', function () {
      expect(maps[1].notAnArray).toBeAn(Array);
    });

    it('should support action maps with modes', function () {
      expect(logger.error.getCall(3).args).toEqual(['ActionMap "invalid" missing "target" property']);
    });
  });
});