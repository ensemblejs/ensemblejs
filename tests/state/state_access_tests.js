'use strict';

var expect = require('expect');

var deferDep = require('../helpers.js').deferDep;
var definePlugin = require('../helpers.js').definePlugin;
var getDefinedPlugin = require('../helpers.js').getDefinedPlugin;

var stateMutator = require('../../src/state/mutator.js').func(deferDep(definePlugin));
var state = getDefinedPlugin('StateAccess');

describe('state access', function () {
  beforeEach(function () {
    stateMutator({
      start: 0,
      controller: {
        child: {
          age: 5,
          siblings: {
            name: 'Geoff'
          }
        }
      }
    });
  });

  it('should return the value you asked for', function () {
    expect(state.get('start')).toEqual(0);
  });

  it('should return a function if the requested key is an object', function () {
    expect(state.get('controller') instanceof Function).toEqual(true);
  });

  it('should allow you to use the returned function to get nested objects', function () {
    expect(state.get('controller')('child')('age')).toEqual(5);
  });

  it('should not allow state mutation through the access', function () {
    try {
      //jshint disable
      state.get('controller')('start') = 999;
    } catch (Error) {}

    expect(state.get('controller')('start')).toNotEqual(999);
  });

  it('should not allow mutable state on nested objects', function () {
    try {
      state.get('controller')('child').age = 21;
    } catch (Error) {}
    try {
      state.get('controller')('child')('siblings').name = 'Roger';
    } catch (Error) {}

    expect(state.get('controller')('age')).toNotEqual(21);
    expect(state.get('controller')('child')('siblings')('name')).toNotEqual('Roger');
  });
});