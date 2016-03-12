'use strict';

var expect = require('expect');
var sinon = require('sinon');
var Bluebird = require('bluebird');

var defer = require('../../support').defer;
var on = require('../../fake/on');
var makeTestible = require('../../support').makeTestible;
var sut = makeTestible('state/server/mutator');
var stateMutator = sut[0];
var onLoadSave = sut[1].OnLoadSave(defer(on));
var state = sut[1].StateAccess();
var rawState = sut[1].RawStateAccess();

var saves = require('../../../src/util/models/saves');

describe('state mutator', function () {
  beforeEach(function () {
    stateMutator(1, {
      controller: {
        start: 0,
        score: 0,
        state: 'ready',
        list: [4],
        idList: [{id: 4}, {id: 3}],
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
    expect(state.for(1).get('controller.child.age')).toBe(123);
  });

  it('should not allow _id to be mutated', function () {
    stateMutator(1, {
      _id: 4,
      controller: {
        state: 'started',
        score: 0,
        child: {
          age: 123
        }
      }
    });

    expect(state.for(1).get('_id')).toEqual(undefined);
  });

  it('should work with adding to arrays', function () {
    stateMutator(1, {
      controller: {
        list: [4, 3]
      }
    });

    expect(state.for(1).for('controller').get('list')).toEqual([4, 3]);
  });

  it('should support adding+ to arrays', function () {
    stateMutator(1, ['controller.list+', 5]);

    expect(state.for(1).for('controller').get('list')).toEqual([4, 5]);
  });

   it('should work with emptying arrays', function () {
    stateMutator(1, {
      controller: {
        list: []
      }
    });

    expect(state.for(1).for('controller').get('list')).toEqual([]);
  });

  it('should support removing- from arrays', function () {
    stateMutator(1, ['controller.idList-', {id: 3}]);

    expect(state.for(1).for('controller').get('idList')).toEqual([{id: 4}]);
  });

  it('should support modifying! arrays', function () {
    stateMutator(1, ['controller.idList!', {id: 4, n: 'a'}]);

    expect(state.for(1).for('controller').get('idList')).toEqual([
      {id: 4, n: 'a'},
      {id: 3}
    ]);
  });

  it('should work with promises', function (done) {
    stateMutator(1, Bluebird.resolve(['controller.score', 2]))
      .then(() => {
        expect(state.for(1).for('controller').get('score')).toEqual(2);
        done();
      });
  });

  it('should work with delayed promises', function (done) {
    stateMutator(1, new Bluebird((resolve) => {
      function delayedReaction () {
        resolve(2);
      }

      setTimeout(delayedReaction, 500);
    })
    .then(value => {
      return ['controller.score', value];
    }))
    .then(() => {
        expect(state.for(1).for('controller').get('score')).toEqual(2);
        done();
      });
  });

  it('should work with rejected promises', function (done) {
    stateMutator(1, Bluebird.reject())
      .catch(() => {
        expect(state.for(1).for('controller').get('score')).toEqual(0);
        done();
      });
  });

  it('should work with different saves', function () {
    stateMutator(12, {
      controller: {
        start: 5
      }
    });

    expect(state.for(1).for('controller').get('start')).toEqual(0);
    expect(state.for(12).for('controller').get('start')).toEqual(5);
  });

  it('should do nothing with undefined', function () {
    stateMutator(1, undefined);
    expect(state.for(1).for('controller').get('state')).toBe('ready');
  });

  it('should do nothing with null', function () {
    stateMutator(1, null);
    expect(state.for(1).for('controller').get('state')).toBe('ready');
  });

  it('should do nothing with empty hashes', function () {
    stateMutator(1, {});
    expect(state.for(1).for('controller').get('state')).toBe('ready');
  });

  describe('dot-string support', function () {
    describe('arrays not of length 2', function () {
      it('should ignore anything that is not an array of arrays', function () {
        stateMutator(1, []);
        stateMutator(1, ['controller.child.age']);
        stateMutator(1, ['controller.child.age', 123, 'third']);

        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should process arrays of arrays if the subarray is length 2', function () {
        stateMutator(1, [['controller.child.age', 123]]);
        expect(state.for(1).get('controller.child.age')).toBe(123);

        stateMutator(1, [
          ['controller.child.age', 2321],
          ['controller.start', 2],
          ['controller.score', 4],
        ]);

        expect(state.for(1).get('controller.child.age')).toBe(2321);
        expect(state.for(1).get('controller.start')).toBe(2);
        expect(state.for(1).get('controller.score')).toBe(4);
      });
    });

    describe('arrays of length 2', function () {
      it('should do nothing if first element of array is not string', function () {
        stateMutator(1, [123, 'controller.child.age']);
        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is undefined', function () {
        stateMutator(1, ['controller.child.age', undefined]);
        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is null', function () {
        stateMutator(1, ['controller.child.age', null]);
        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is empty hash', function () {
        stateMutator(1, ['controller.child.age', {}]);
        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should unwrap dot strings into objects', function () {
        stateMutator(1, ['controller.child.age', 123]);
        expect(state.for(1).get('controller.child.age')).toBe(123);
      });

      it('should work where the second argument is an array', function () {
        stateMutator(1, ['controller.list', [1, 2, 3]]);
        expect(state.for(1).get('controller.list')).toEqual([1, 2, 3]);
      });
    });
  });

  describe('on save load', function () {
    beforeEach(function (done) {
      sinon.stub(saves, 'getById').returns(Bluebird.resolve({
        ensemble: { waitingForPlayers: false, paused: false }
      }));

      onLoadSave({id: 3, mode: 'arcade'}).then(function () { done(); });
    });

    afterEach(function () {
      saves.getById.restore();
    });

    it('should store the save state and keep it in memory', function () {
      expect(saves.getById.firstCall.args).toEqual([3]);
      expect(rawState.for(3)).toEqual({ensemble: { waitingForPlayers: true, paused: true }});
    });

    it('should set waitingForPlayers to true', function () {
      expect(rawState.for(3).ensemble.waitingForPlayers).toBe(true);
    });

    it('should set paused to true', function () {
      expect(rawState.for(3).ensemble.paused).toBe(true);
    });

    it('should call on save ready', function () {
      expect(on.saveReady.called).toEqual(true);
    });
  });
});