'use strict';

var expect = require('expect');
var replaceIfPresent = require('../../src/util/replace-if-present');

describe('replaceIfPresent', function() {
  it('should replace values that exist in the first and second objects', function () {
    expect(replaceIfPresent({a: 1}, {a: 2})).toEqual({a: 2});
  });

  it('should ignore values that only exist in the second objects', function () {
    expect(replaceIfPresent({a: 1}, {a: 2, b: 3})).toEqual({a: 2});
  });

  it('should keep values that only exist in the first objects', function () {
    expect(replaceIfPresent({a: 1}, {b: 3})).toEqual({a: 1});
  });

  it('should do a deep replace', function () {
    expect(replaceIfPresent({a: 1, n: {d: true}}, {b: 3, n: {d: false, ignore: true}})).toEqual({a: 1, n: {d: false}});
  });
});