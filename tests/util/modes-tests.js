'use strict';

var expect = require('expect');
var modes = require('../../src/util/modes');

describe('modes util', function () {
  describe('isApplicable', function () {
    it('should always match the * plugin', function () {
      expect(modes.isApplicable('arcade', ['*', {}])).toEqual(true);
    });

    it('should match plugins with the same mode', function () {
      expect(modes.isApplicable('arcade', ['arcade', {}])).toEqual(true);
    });

    it('should not match plugins with different modes', function () {
      expect(modes.isApplicable('arcade', ['endless', {}])).toEqual(false);
    });

    it('should not match plugins with multiple modes', function () {
      expect(modes.isApplicable('arcade', [['endless', 'arcade'], {}])).toEqual(true);
      expect(modes.isApplicable('arcade', [['endless', 'diehard'], {}])).toEqual(false);
    });
  });
});