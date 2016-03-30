'use strict';

var expect = require('expect');

describe('the node module', function () {
  it('exports the framework', function () {
    this.timeout(10000);

    expect(require('../server.js').runGameAtPath).toNotBe(undefined);
  });
});