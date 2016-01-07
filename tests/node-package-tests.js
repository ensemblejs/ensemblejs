'use strict';

var expect = require('expect');

describe('the node module', function () {
  it('exports the framework', function () {
    expect(require('../ensemble.js').runGameAtPath).toNotBe(undefined);
  });
});