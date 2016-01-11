'use strict';

var expect = require('expect');

var defer = require('../../support').defer;
var plugin = require('../../support').plugin();
var fakeLogger = require('../../fake/logger');

var stateMutator = require('../../../src/state/server/mutator').func(defer(plugin.define), defer(fakeLogger));
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
      },
      arrayOfThings: [1, 2, 3],
      player: {
        1: { controller: { score: 10 } },
        2: { controller: { score: 20 } },
        3: { controller: { score: 34 } }
      }
    });
  });

  it('should return the value you asked for', function () {
    expect(state.for(1).for('controller').get('start')).toEqual(0);
    expect(state.for(1).get('controller.start')).toEqual(0);
  });

  it('should return a function if the requested key is an object', function () {
    expect(state.for(1).for('controller').get instanceof Function).toEqual(true);
    expect(state.for(1).get('controller.child') instanceof Function).toEqual(true);
  });

  it('should allow you to use the returned function to get nested objects', function () {
    expect(state.for(1).for('controller').get('child')('age')).toEqual(5);
    expect(state.for(1).get('controller')('child.age')).toEqual(5);
  });

  it('should not allow mutable state on nested objects', function () {
    try {
      state.for(1).for('controller').get('child').age = 21;
    } catch (Error) {}
    try {
      state.for(1).get('controller.child').age = 21;
    } catch (Error) {}
    try {
      state.for(1).for('controller').get('child')('siblings').name = 'Roger';
    } catch (Error) {}
    try {
      state.for(1).get('controller.child.siblings').name = 'Roger';
    } catch (Error) {}

    expect(state.for(1).for('controller').get('age')).toNotEqual(21);
    expect(state.for(1).for('controller').get('child')('siblings')('name')).toNotEqual('Roger');
  });

  describe('player data access', function () {
    it('should scope to the player number', function () {
      expect(state.for(1).player(1).for('controller').get('score')).toEqual(10);
      expect(state.for(1).player(2).for('controller').get('score')).toEqual(20);
      expect(state.for(1).player(3).for('controller').get('score')).toEqual(34);
    });

    it('should support dot-strings', function () {
      expect(state.for(1).player(1).get('controller.score')).toEqual(10);
      expect(state.for(1).player(2).get('controller.score')).toEqual(20);
      expect(state.for(1).player(3).get('controller.score')).toEqual(34);
    });
  });

  describe('unwrapping', function () {
    it('should unwrap literals', function () {
      expect(state.for(1).unwrap('controller.start')).toEqual(0);
    });

    it ('should work off namespaces', function () {
      expect(state.for(1).for('controller').unwrap('start')).toEqual(0);
    });

    it('should unwrap objects', function () {
      expect(state.for(1).unwrap('controller.child.siblings')).toEqual({ name: 'Geoff' });
    });

    it('should unwrap arrays', function () {
      expect(state.for(1).unwrap('arrayOfThings')).toEqual([1, 2, 3]);
    });

    it('should unwrap nested objects', function () {
      expect(state.for(1).unwrap('controller.child')).toEqual({
        age: 5,
        siblings: {
          name: 'Geoff'
        }
      });
    });

    it('should work for player data access', function () {
      expect(state.for(1).player(1).for('controller').unwrap('score')).toEqual(10);
      expect(state.for(1).player(1).unwrap('controller.score')).toEqual(10);
    });

    describe('immutable unwraps' , function () {
      it('should ignore literal changes', function () {
        var value = state.for(1).unwrap('controller.start');
        value = 3;

        expect(state.for(1).get('controller.start')).toEqual(0);
      });

      it('should ignore object changes', function () {
        var value = state.for(1).unwrap('controller.child.siblings');
        value.name = 'Roger';

        expect(state.for(1).unwrap('controller.child.siblings')).toEqual({ name: 'Geoff' });
      });

      it('should ignore array changes', function () {
        var value = state.for(1).unwrap('arrayOfThings');
        value.push(4);

        expect(state.for(1).unwrap('arrayOfThings')).toEqual([1, 2, 3]);
      });

      it('should ignore nested object changes', function () {
        var value = state.for(1).unwrap('controller.child');
        value.age = 6;
        value.siblings.banana = true;
        value.siblings.name = 'Roger';

        expect(state.for(1).unwrap('controller.child')).toEqual({
          age: 5,
          siblings: {
            name: 'Geoff'
          }
        });
      });

      it('should work for player data access', function () {
        var value = state.for(1).player(1).for('controller').unwrap('score');
        value = 30;

        expect(state.for(1).player(1).unwrap('controller.score')).toEqual(10);
      });
    });
  });
});