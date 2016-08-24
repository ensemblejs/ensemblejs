'use strict';

var expect = require('expect');

var defer = require('../../support').defer;
var plugin = require('../../support').plugin();
var fakeLogger = require('../../fake/logger');

var stateMutator = require('../../../src/state/server/mutator').func(defer(plugin.define), defer(fakeLogger));
const deps = plugin.deps();
var state = deps.StateAccess();
var rawStateAccess = deps.RawStateAccess();
var applyPendingMerges = deps.ApplyPendingMerges();

describe('server state access', function () {
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
      idArray: [{id: 1, c: 'b'}, {id: 2, c: 'd'}, {id: 3, c: 'f'}],
      sub: [{id: 1, subsub: [{id: 2, f: 'h'}]}],
      players: [
        { id: 1, controller: { score: 10 } },
        { id: 2, controller: { score: 20 } },
        { id: 3, controller: { score: 34 } }
      ]
    });

    applyPendingMerges();

    // rawStateAccess.flush(1);
  });

  it('should return the value you asked for', function () {
    expect(state.for(1).get('controller.start')).toEqual(0);
    expect(state.for(1).get('arrayOfThings').toJS()).toEqual([1,2,3]);
    expect(state.for(1).get('idArray:2.id')).toEqual(2);
    expect(state.for(1).get('idArray:2.c')).toEqual('d');
    expect(state.for(1).get('idArray').toJS()).toEqual([{id: 1, c: 'b'}, {id: 2, c: 'd'}, {id: 3, c: 'f'}]);
    expect(state.for(1).get('idArray*.c').toJS()).toEqual(['b', 'd', 'f']);
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

  describe.skip('unwrapping', function () {
    it('should unwrap literals', function () {
      expect(state.for(1).unwrap('controller.start')).toEqual(0);
    });

    it ('should work off namespaces', function () {
      expect(state.for(1).for('controller').unwrap('start')).toEqual(0);
    });

    it('should unwrap objects', function () {
      expect(state.for(1).unwrap('controller.child.siblings').toJS()).toEqual({ name: 'Geoff' });
    });

    it('should unwrap lenses', function () {
      function lens (s) {
        return s.controller.child.siblings;
      }

      expect(state.for(1).unwrap(lens)).toEqual({ name: 'Geoff' });
    });

    it('should unwrap by id', function () {
      expect(state.for(1).unwrap('idArray:2')).toEqual({id: 2, c: 'd'});
    });

    it('should unwrap by id with children', function () {
      expect(state.for(1).unwrap('idArray:2.c')).toEqual('d');
    });

    it('should unwrap array children', function () {
      expect(state.for(1).unwrap('idArray*.c')).toEqual(['b', 'd', 'f']);
    });

    it('should unwrap by id with sub id', function () {
      expect(state.for(1).unwrap('sub:1.subsub:2.f')).toEqual('h');
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

  describe('raw state access', () => {
    describe.skip('flushing', () => {
      it('should not return unapplied changed', () => {
        stateMutator(1, ['controller.start', 3]);

        expect(rawStateAccess.flush(1)).toEqual([]);
      });

      it('should return all changes that have been _applied_ since the last call', () => {
        stateMutator(1, ['controller.start', 3]);
        applyPendingMerges();

        expect(rawStateAccess.flush(1)).toEqual([{
          controller: { start: 3 }
        }]);
      });

      it('should return multiple changes for the same prop', () => {
        stateMutator(1, ['controller.start', 3]);
        applyPendingMerges();
        stateMutator(1, ['controller.start', 6]);
        applyPendingMerges();

        expect(rawStateAccess.flush(1)).toEqual([
          { controller: { start: 3 } },
          { controller: { start: 6 } }
        ]);
      });

      it('should return an empty array on subsequent calls', () => {
        stateMutator(1, ['controller.start', 3]);
        applyPendingMerges();
        rawStateAccess.flush(1);

        expect(rawStateAccess.flush(1)).toEqual([]);
      });
    });
  });
});