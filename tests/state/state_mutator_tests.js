'use strict';

var expect = require('expect');

var deferDep = require('../helpers.js').deferDep;
var definePlugin = require('../helpers.js').definePlugin;
var getDefinedPlugin = require('../helpers.js').getDefinedPlugin;

var stateMutator = require('../../src/state/mutator.js').func(deferDep(definePlugin));
var state = getDefinedPlugin('StateAccess');

describe('as before but return new objects with only the changed state', function () {
  beforeEach(function () {
    stateMutator(1, {
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

    stateMutator(12, {
      controller: {
        start: 0,
      }
    });
  });

  it('should allow a single value to mutate', function () {
    stateMutator(1, {
      controller: {
        state: 'started',
        score: 0,
        child: {
          age: 123
        }
      }
    });

    expect(state.for(1).for('controller').get('state')).toBe('started');
    expect(state.for(1).for('controller').get('score')).toBe(0);
    expect(state.for(1).for('controller').get('child')('age')).toBe(123);
  });

  it('should work with adding to arrays', function () {
    stateMutator(1, {
      controller: {
        list: [4, 3]
      }
    });

    expect(state.for(1).for('controller').get('list')).toEqual([4, 3]);
  });

  it('should work with removing elements from arrays', function () {
    stateMutator(1, {
      controller: {
        list: []
      }
    });

    expect(state.for(1).for('controller').get('list')).toEqual([]);
  });

  it('should work with different games', function () {
    stateMutator(12, {
      controller: {
        start: 5
      }
    });

    expect(state.for(1).for('controller').get('start')).toEqual(0);
    expect(state.for(12).for('controller').get('start')).toEqual(5);
  });
});