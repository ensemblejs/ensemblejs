'use strict';

var expect = require('expect');

import {plugin} from '../../../src/plugins/plug-n-play';
var defer = require('../../support').defer;
var logger = require('../../fake/logger');

var stateMutator = require('src/state/client/mutator').func(defer(logger));
var state = plugin('StateAccess');
var afterPhysicsFrame = plugin('AfterPhysicsFrame');

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

    afterPhysicsFrame();
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
    afterPhysicsFrame();

    expect(state.for().for('controller').get('state')).toBe('started');
    expect(state.for().for('controller').get('score')).toBe(0);
    expect(state.for().get('controller.child.age')).toBe(123);
  });

  it('should work with adding to arrays', function () {
    stateMutator(1, {
      controller: {
        list: [4, 3]
      }
    });
    afterPhysicsFrame();

    expect(state.for().for('controller').get('list')).toEqual([4, 3]);
  });

  it('should work with removing elements from arrays', function () {
    stateMutator(1, {
      controller: {
        list: []
      }
    });
    afterPhysicsFrame();

    expect(state.for().for('controller').get('list')).toEqual([]);
  });

  it('should do nothing with undefined', function () {
    stateMutator(1, undefined);
    afterPhysicsFrame();
    expect(state.for().for('controller').get('state')).toBe('ready');
  });

  it('should do nothing with null', function () {
    stateMutator(1, null);
    afterPhysicsFrame();
    expect(state.for().for('controller').get('state')).toBe('ready');
  });

  it('should do nothing with empty hashes', function () {
    stateMutator(1, {});
    afterPhysicsFrame();
    expect(state.for().for('controller').get('state')).toBe('ready');
  });

  describe('dot-string support', function () {
    describe('arrays not of length 2', function () {
      it('should ignore anything that is not an array of arrays', function () {
        stateMutator(1, []);
        stateMutator(1, ['controller.child.age']);
        stateMutator(1, ['controller.child.age', 123, 'third']);
        afterPhysicsFrame();

        expect(state.for().get('controller.child.age')).toBe(5);
      });

      it('should process arrays of arrays if the subarray is length 2', function () {
        stateMutator(1, [['controller.child.age', 123]]);
        afterPhysicsFrame();
        expect(state.for().get('controller.child.age')).toBe(123);

        stateMutator(1, [
          ['controller.child.age', 2321],
          ['controller.start', 2],
          ['controller.score', 4],
        ]);
        afterPhysicsFrame();

        expect(state.for().get('controller.child.age')).toBe(2321);
        expect(state.for().get('controller.start')).toBe(2);
        expect(state.for().get('controller.score')).toBe(4);
      });
    });

    describe('arrays of length 2', function () {
      it('should do nothing if first element of array is not string', function () {
        stateMutator(1, [123, 'controller.child.age']);
        afterPhysicsFrame();
        expect(state.for().get('controller.child.age')).toBe(5);
      });
      it('should do nothing if second element of array is undefined', function () {
        stateMutator(1, ['controller.child.age', undefined]);
        afterPhysicsFrame();
        expect(state.for().get('controller.child.age')).toBe(5);
      });
      it('should do nothing if second element of array is null', function () {
        stateMutator(1, ['controller.child.age', null]);
        afterPhysicsFrame();
        expect(state.for().get('controller.child.age')).toBe(5);
      });
      it('should do nothing if second element of array is empty hash', function () {
        stateMutator(1, ['controller.child.age', {}]);
        afterPhysicsFrame();
        expect(state.for().get('controller.child.age')).toBe(5);
      });

      it('should unwrap dot strings into objects', function () {
        stateMutator(1, ['controller.child.age', 123]);
        afterPhysicsFrame();
        expect(state.for().get('controller.child.age')).toBe(123);
      });
    });
  });
});