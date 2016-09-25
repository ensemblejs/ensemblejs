'use strict';

const expect = require('expect');

const { requirePlugin, capture } = require('../../support');
const mutatorDeps = capture();

const stateMutator = requirePlugin('state/server/mutator', {}, {
  '../src/': mutatorDeps.define
});

const state = mutatorDeps.deps().StateAccess();
const applyPendingMerges = mutatorDeps.deps().ApplyPendingMerges();

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
});