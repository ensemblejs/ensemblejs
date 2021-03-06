'use strict';

var expect = require('expect');
var sinon = require('sinon');
var Bluebird = require('bluebird');

var defer = require('../../support').defer;
var on = require('../../fake/on');
var makeTestible = require('../../support').makeTestible;

const tracker = {
  sync: sinon.spy()
};

const { requirePlugin, capture } = require('../../support');
const mutatorDeps = capture();

const stateMutator = requirePlugin('state/server/mutator', {}, {
  '../src/': mutatorDeps.define
});

const state = mutatorDeps.deps().StateAccess();
const rawState = mutatorDeps.deps().RawStateAccess();
const applyPendingMerges = mutatorDeps.deps().ApplyPendingMerges();
const afterPhysicsFrame = mutatorDeps.deps().AfterPhysicsFrame();
const onLoadSave = mutatorDeps.deps().OnLoadSave(defer(on), defer(tracker));

// var stateMutator = sut[0];
// var onLoadSave = sut[1].OnLoadSave(defer(on), defer(tracker));
// var state = sut[1].StateAccess();
// var rawState = sut[1].RawStateAccess();
// var applyPendingMerges = sut[1].ApplyPendingMerges();
// var afterPhysicsFrame = sut[1].AfterPhysicsFrame();

var saves = require('../../../src/util/models/saves');

describe('state mutation on the server', function () {
  beforeEach(function () {
    stateMutator(1, {
    controller: {
        start: 0,
        score: 0,
        state: 'ready',
        list: [4],
        idList: [{id: 4}, {id: 3}],
        subPush: [{id: 5, arr: []}],
        child: {
          age: 5,
          siblings: {
            name: 'Geoff'
          }
        }
      },
      players: []
    });

    stateMutator(12, {
      controller: {
        start: 0
      }
    });

    applyPendingMerges();
  });

  describe('simple behaviour', function () {
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

      afterPhysicsFrame();

      expect(state.for(1).get('_id')).toEqual(undefined);
    });

    it('should work with adding to arrays', function () {
      stateMutator(1, {
        controller: {
          list: [4, 3]
        }
      });

      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('list').toJS()).toEqual([4, 3]);
    });
  });

  describe('using functions to alter the current state', function () {
    function happyBirthday (age) {
      return age +1;
    }

    function addItem (items) {
      return items.concat([3]);
    }

    function resetList () {
      return [];
    }

    describe('simple behaviour', function () {
      it('should allow a function to be used to modify the existing value', () => {
        stateMutator(1, ['controller.child.age', happyBirthday]);

        afterPhysicsFrame();

        expect(state.for(1).get('controller.child.age')).toBe(6);
      });

      it('should work with adding to arrays', function () {
        stateMutator(1, ['controller.list', addItem]);

        afterPhysicsFrame();

        expect(state.for(1).for('controller').get('list').toJS()).toEqual([4, 3]);
      });

      it('should work with removing elements from arrays', function () {
        stateMutator(1, ['controller.list', resetList]);

        afterPhysicsFrame();

        expect(state.for(1).for('controller').get('list').toJS()).toEqual([]);
      });
    });

    describe('using shorthand notation', function () {
      beforeEach(() => {
        sinon.spy(console, 'error');
      });

      afterEach(() => {
        console.error.restore();
      });

      it('should support adding+ to arrays', function () {
        stateMutator(1, ['controller.list+', addItem]);

        afterPhysicsFrame();

        expect(console.error.callCount).toBe(1);
        expect(console.error.firstCall.args[1]).toEqual('Using a function on the + operator is not supported. Remove the + operator to achieve desired effect.');
      });

      it('should support removing- from arrays', function () {
        stateMutator(1, ['controller.idList-', addItem]);

        afterPhysicsFrame();

        expect(console.error.callCount).toBe(1);
        expect(console.error.firstCall.args[1]).toEqual('Using a function on the - operator is not supported. Remove the - operator to achieve desired effect.');
      });

      it('should support replacing! arrays', function () {
        stateMutator(1, ['controller.idList!', addItem]);

        afterPhysicsFrame();

        expect(console.error.callCount).toBe(1);
        expect(console.error.firstCall.args[1]).toEqual('Using a function on the ! operator is not supported. Remove the ! operator to achieve desired effect.');
      });

      it('should support modifying: arrays', function () {
        function addN (item) {
          expect(item.toJS()).toEqual({id: 4});

          return item.set('n', 'h');
        }
        stateMutator(1, ['controller.idList:4', addN]);

        afterPhysicsFrame();

        expect(state.for(1).for('controller').get('idList').toJS()).toEqual([
          {id: 4, n: 'h'},
          {id: 3}
        ]);
      });

      it('should support modifying arrays children', function () {
        function makeNZ (item) {
          expect(item).toBe(undefined);

          return 'z';
        }

        stateMutator(1, ['controller.idList:4.n', makeNZ]);

        afterPhysicsFrame();

        expect(state.for(1).for('controller').get('idList').toJS()).toEqual([
          {id: 4, n: 'z'},
          {id: 3}
        ]);
      });
    });
  });

  describe('using shorthand notation', function () {
    it('should support adding+ to arrays', function () {
      stateMutator(1, ['controller.list+', 5]);

      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('list').toJS()).toEqual([4, 5]);
    });

    it('should support adding+ to arrays of arrays', function () {
      stateMutator(1, ['controller.subPush:5.arr+', 5]);

      afterPhysicsFrame();

      expect(state.for(1).get('controller.subPush:5.arr').toJS()).toEqual([5]);
    });

     it('should work with emptying arrays', function () {
      stateMutator(1, {
        controller: {
          list: []
        }
      });

      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('list').toJS()).toEqual([]);
    });

    it('should support removing- from arrays', function () {
      stateMutator(1, ['controller.idList-', {id: 3}]);

      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('idList').toJS()).toEqual([{id: 4}]);
    });

    it('should support modifying! arrays', function () {
      stateMutator(1, ['controller.idList!', {id: 4, n: 'a'}]);

      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('idList').toJS()).toEqual([
        {id: 4, n: 'a'},
        {id: 3}
      ]);
    });

    it('should support modifying: arrays', function () {
      stateMutator(1, ['controller.idList:4', {n: 'h'}]);

      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('idList').toJS()).toEqual([
        {id: 4, n: 'h'},
        {id: 3}
      ]);
    });

    it('should support modifying arrays children', function () {
      stateMutator(1, ['controller.idList:4.n', 'z']);

      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('idList').toJS()).toEqual([
        {id: 4, n: 'z'},
        {id: 3}
      ]);
    });
  });

  describe('working with promises', function () {
    it('should work with promises', function (done) {
      stateMutator(1, Bluebird.resolve(['controller.score', 2]))
        .then(() => {
          afterPhysicsFrame();
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
        afterPhysicsFrame();

        expect(state.for(1).for('controller').get('score')).toEqual(2);
        done();
      });
    });

    it('should work with rejected promises', function (done) {
      stateMutator(1, Bluebird.reject())
        .catch(() => {
          afterPhysicsFrame();

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

      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('start')).toEqual(0);
      expect(state.for(12).for('controller').get('start')).toEqual(5);
    });
  });

  describe('when you do not want to mutate state', function () {
    it('should do nothing with undefined', function () {
      stateMutator(1, undefined);
      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('state')).toBe('ready');
    });

    it('should do nothing with null', function () {
      stateMutator(1, null);
      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('state')).toBe('ready');
    });

    it('should do nothing with empty hashes', function () {
      stateMutator(1, {});
      afterPhysicsFrame();

      expect(state.for(1).for('controller').get('state')).toBe('ready');
    });
  });

  describe('arrays of arrays', function () {
    describe('arrays not of length 2', function () {
      it('should ignore anything that is not an array of arrays', function () {
        stateMutator(1, []);
        stateMutator(1, ['controller.child.age']);
        stateMutator(1, ['controller.child.age', 123, 'third']);

        afterPhysicsFrame();

        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should process arrays of arrays if the subarray is length 2', function () {
        stateMutator(1, [['controller.child.age', 123]]);
        afterPhysicsFrame();
        expect(state.for(1).get('controller.child.age')).toBe(123);

        stateMutator(1, [
          ['controller.child.age', 2321],
          ['controller.start', 2],
          ['controller.score', 4]
        ]);

        afterPhysicsFrame();

        expect(state.for(1).get('controller.child.age')).toBe(2321);
        expect(state.for(1).get('controller.start')).toBe(2);
        expect(state.for(1).get('controller.score')).toBe(4);
      });
    });

    describe('arrays of length 2', function () {
      it('should do nothing if first element of array is not string', function () {
        stateMutator(1, [123, 'controller.child.age']);
        afterPhysicsFrame();
        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is undefined', function () {
        stateMutator(1, ['controller.child.age', undefined]);
        afterPhysicsFrame();
        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is null', function () {
        stateMutator(1, ['controller.child.age', null]);
        afterPhysicsFrame();
        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is empty hash', function () {
        stateMutator(1, ['controller.child.age', {}]);
        afterPhysicsFrame();
        expect(state.for(1).get('controller.child.age')).toBe(5);
      });

      it('should unwrap dot strings into objects', function () {
        stateMutator(1, ['controller.child.age', 123]);
        afterPhysicsFrame();
        expect(state.for(1).get('controller.child.age')).toBe(123);
      });

      it('should work where the second argument is an array', function () {
        stateMutator(1, ['controller.list', [1, 2, 3]]);
        afterPhysicsFrame();
        expect(state.for(1).get('controller.list').toJS()).toEqual([1, 2, 3]);
      });
    });
  });

  describe('on save load', function () {
    beforeEach(function (done) {
      sinon.stub(saves, 'getById').returns(Bluebird.resolve({
        ensemble: { waitingForPlayers: false, paused: false }
      }));

      tracker.sync.reset();

      onLoadSave({id: 3, mode: 'arcade'}).then(function () { done(); });
    });

    afterEach(function () {
      saves.getById.restore();
    });

    it('should store the save state and keep it in memory', function () {
      expect(saves.getById.firstCall.args).toEqual([3]);
      expect(rawState.for(3).toJS()).toEqual({ensemble: { waitingForPlayers: true, paused: true }});
    });

    it('should set waitingForPlayers to true', function () {
      expect(state.for(3).get('ensemble.waitingForPlayers')).toBe(true);
    });

    it('should set paused to true', function () {
      expect(state.for(3).get('ensemble.paused')).toBe(true);
    });

    it('should call on save ready', function () {
      expect(on.saveReady.called).toEqual(true);
    });
  });

  describe('specific error scenarios', () => {
    beforeEach(() => {
      stateMutator(1, [ 'players+', {
        id: 1, pacman: { position: { x: 100, y: 100 } }
      }]);

      afterPhysicsFrame();
    });

    it('should not crash with entry.get is not a function', () => {
      stateMutator(1, [['players:1.pacman.position', { x: 208, y: 368 }]] );

      afterPhysicsFrame();
    });
  });
});