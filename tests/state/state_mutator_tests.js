'use strict';

var expect = require('expect');

var deferDep = require('../helpers.js').deferDep;
var definePlugin = require('../helpers.js').definePlugin;
var getDefinedPlugin = require('../helpers.js').getDefinedPlugin;

var stateMutator = require('../../src/state/mutator.js').func(deferDep(definePlugin));
var state = getDefinedPlugin('StateAccess');

describe('as before but return new objects with only the changed state', function () {
  beforeEach(function () {
    stateMutator({
      controller: {
        start: 0,
        score: 0,
        state: 'ready',
        list: [4],
        child: {
          age: 5,
          siblings: {
            name: 'Geoff'
          }
        }
      }
    });
  });

  it('should allow a single value to mutate', function () {
    stateMutator({
      controller: {
        state: 'started',
        score: 0,
        child: {
          age: 123
        }
      }
    });

    expect(state.get('controller')('state')).toBe('started');
    expect(state.get('controller')('score')).toBe(0);
    expect(state.get('controller')('child')('age')).toBe(123);
  });

  it('should work with adding to arrays', function () {
    stateMutator({
      controller: {
        list: [4, 3]
      }
    });

    expect(state.get('controller')('list')).toEqual([4, 3]);
  });

  it('should work with removing elements from arrays', function () {
    stateMutator({
      controller: {
        list: []
      }
    });

    expect(state.get('controller')('list')).toEqual([]);
  });
});