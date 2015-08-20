'use strict';

var expect = require('expect');

var defer = require('../support').defer;
var plugin = require('../support').plugin();

var stateMutator = require('../../src/state/server/mutator').func(defer(plugin.define));
var state = plugin.deps().StateAccess();

describe('state access', function () {
  beforeEach(function () {
    stateMutator(1, {
      controller: {
        start: 0,
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
    expect(state.for(1).for('controller').get('start')).toEqual(0);
  });

  it('should return a function if the requested key is an object', function () {
    expect(state.for(1).for('controller').get instanceof Function).toEqual(true);
  });

  it('should allow you to use the returned function to get nested objects', function () {
    expect(state.for(1).for('controller').get('child')('age')).toEqual(5);
  });

  it('should not allow state mutation through the access', function () {
    try {
      //jshint: disable
      state.for(1).for('controller').get('start') = 999;
    } catch (Error) {}

    expect(state.for(1).for('controller').get('start')).toNotEqual(999);
  });

  it('should not allow mutable state on nested objects', function () {
    try {
      state.for(1).for('controller').get('child').age = 21;
    } catch (Error) {}
    try {
      state.for(1).for('controller').get('child')('siblings').name = 'Roger';
    } catch (Error) {}

    expect(state.for(1).for('controller').get('age')).toNotEqual(21);
    expect(state.for(1).for('controller').get('child')('siblings')('name')).toNotEqual('Roger');
  });
});