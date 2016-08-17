'use strict';

var expect = require('expect');
var sinon = require('sinon');
var Bluebird = require('bluebird');

import theGreatMutator from '../../src/util/the-great-mutator';

describe('the great mutator', function () {
  let mutator;

  beforeEach(function () {
    mutator = theGreatMutator({
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

    mutator.applyPendingMerges();
  });

  describe('simple behaviour', function () {
    it('should allow a single value to mutate', function () {
      mutator.mutate({
        controller: {
          state: 'started',
          score: 0,
          child: {
            age: 123
          }
        }
      });

      mutator.applyPendingMerges();

      expect(mutator.get('controller.state')).toBe('started');
      expect(mutator.get('controller.score')).toBe(0);
      expect(mutator.get('controller.child.age')).toBe(123);
    });

    it('should not allow _id to be mutated', function () {
      mutator.mutate({
        _id: 4,
        controller: {
          state: 'started',
          score: 0,
          child: {
            age: 123
          }
        }
      });

      mutator.applyPendingMerges();

      expect(mutator.get('_id')).toEqual(undefined);
    });

    it('should work with adding to arrays', function () {
      mutator.mutate({
        controller: {
          list: [4, 3]
        }
      });

      mutator.applyPendingMerges();

      expect(mutator.get('controller.list')).toEqual([4, 3]);
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
        mutator.mutate(['controller.child.age', happyBirthday]);

        mutator.applyPendingMerges();

        expect(mutator.get('controller.child.age')).toBe(6);
      });

      it('should work with adding to arrays', function () {
        mutator.mutate(['controller.list', addItem]);

        mutator.applyPendingMerges();

        expect(mutator.get('controller.list')).toEqual([4, 3]);
      });

      it('should work with removing elements from arrays', function () {
        mutator.mutate(['controller.list', resetList]);

        mutator.applyPendingMerges();

        expect(mutator.get('controller.list')).toEqual([]);
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
        mutator.mutate(['controller.list+', addItem]);

        mutator.applyPendingMerges();

        expect(console.error.callCount).toBe(1);
        expect(console.error.firstCall.args[1]).toEqual('Using a function on the + operator is not supported. Remove the + operator to acheive desired effect.');
      });

      it('should support removing- from arrays', function () {
        mutator.mutate(['controller.idList-', addItem]);

        mutator.applyPendingMerges();

        expect(console.error.callCount).toBe(1);
        expect(console.error.firstCall.args[1]).toEqual('Using a function on the - operator is not supported. Remove the - operator to acheive desired effect.');
      });

      it('should support replacing! arrays', function () {
        mutator.mutate(['controller.idList!', addItem]);

        mutator.applyPendingMerges();

        expect(console.error.callCount).toBe(1);
        expect(console.error.firstCall.args[1]).toEqual('Using a function on the ! operator is not supported. Remove the ! operator to acheive desired effect.');
      });

      it('should support modifying: arrays', function () {
        function addN (item) {
          expect(item).toEqual({id: 4});

          item.n = 'h';
          return item;
        }
        mutator.mutate(['controller.idList:4', addN]);

        mutator.applyPendingMerges();

        expect(mutator.get('controller.idList')).toEqual([
          {id: 4, n: 'h'},
          {id: 3}
        ]);
      });

      it('should support modifying arrays children', function () {
        function makeNZ (item) {
          expect(item).toBe(undefined);

          return 'z';
        }

        mutator.mutate(['controller.idList:4.n', makeNZ]);

        mutator.applyPendingMerges();

        expect(mutator.get('controller.idList')).toEqual([
          {id: 4, n: 'z'},
          {id: 3}
        ]);
      });
    });
  });

  describe('using shorthand notation', function () {
    it('should support adding+ to arrays', function () {
      mutator.mutate(['controller.list+', 5]);

      mutator.applyPendingMerges();

      expect(mutator.get('controller.list')).toEqual([4, 5]);
    });

    it('should support adding+ to arrays of arrays', function () {
      mutator.mutate(['controller.subPush:5.arr+', 5]);

      mutator.applyPendingMerges();

      expect(mutator.get('controller.subPush:5.arr')).toEqual([5]);
    });

     it('should work with emptying arrays', function () {
      mutator.mutate({
        controller: {
          list: []
        }
      });

      mutator.applyPendingMerges();

      expect(mutator.get('controller.list')).toEqual([]);
    });

    it('should support removing- from arrays', function () {
      mutator.mutate(['controller.idList-', {id: 3}]);

      mutator.applyPendingMerges();

      expect(mutator.get('controller.idList')).toEqual([{id: 4}]);
    });

    it('should support modifying! arrays', function () {
      mutator.mutate(['controller.idList!', {id: 4, n: 'a'}]);

      mutator.applyPendingMerges();

      expect(mutator.get('controller.idList')).toEqual([
        {id: 4, n: 'a'},
        {id: 3}
      ]);
    });

    it('should support modifying: arrays', function () {
      mutator.mutate(['controller.idList:4', {n: 'h'}]);

      mutator.applyPendingMerges();

      expect(mutator.get('controller.idList')).toEqual([
        {id: 4, n: 'h'},
        {id: 3}
      ]);
    });

    it('should support modifying arrays children', function () {
      mutator.mutate(['controller.idList:4.n', 'z']);

      mutator.applyPendingMerges();

      expect(mutator.get('controller.idList')).toEqual([
        {id: 4, n: 'z'},
        {id: 3}
      ]);
    });
  });

  describe('working with promises', function () {
    it('should work with promises', function (done) {
      mutator.mutate(Bluebird.resolve(['controller.score', 2]))
        .then(() => {
          mutator.applyPendingMerges();
          expect(mutator.get('controller.score')).toEqual(2);
          done();
        });
    });

    it('should work with delayed promises', function (done) {
      mutator.mutate(new Bluebird((resolve) => {
        function delayedReaction () {
          resolve(2);
        }

        setTimeout(delayedReaction, 500);
      })
      .then(value => {
        return ['controller.score', value];
      }))
      .then(() => {
        mutator.applyPendingMerges();

        expect(mutator.get('controller.score')).toEqual(2);
        done();
      });
    });

    it('should work with rejected promises', function (done) {
      mutator.mutate(Bluebird.reject())
        .catch(() => {
          mutator.applyPendingMerges();

          expect(mutator.get('controller.score')).toEqual(0);
          done();
        });
    });
  });

  describe('when you do not want to mutate state', function () {
    it('should do nothing with undefined', function () {
      mutator.mutate(undefined);
      mutator.applyPendingMerges();

      expect(mutator.get('controller.state')).toBe('ready');
    });

    it('should do nothing with null', function () {
      mutator.mutate(null);
      mutator.applyPendingMerges();

      expect(mutator.get('controller.state')).toBe('ready');
    });

    it('should do nothing with empty hashes', function () {
      mutator.mutate({});
      mutator.applyPendingMerges();

      expect(mutator.get('controller.state')).toBe('ready');
    });
  });

  describe('arrays of arrays', function () {
    describe('arrays not of length 2', function () {
      it('should ignore anything that is not an array of arrays', function () {
        mutator.mutate([]);
        mutator.mutate(['controller.child.age']);
        mutator.mutate(['controller.child.age', 123, 'third']);

        mutator.applyPendingMerges();

        expect(mutator.get('controller.child.age')).toBe(5);
      });

      it('should process arrays of arrays if the subarray is length 2', function () {
        mutator.mutate([['controller.child.age', 123]]);
        mutator.applyPendingMerges();
        expect(mutator.get('controller.child.age')).toBe(123);

        mutator.mutate([
          ['controller.child.age', 2321],
          ['controller.start', 2],
          ['controller.score', 4]
        ]);

        mutator.applyPendingMerges();

        expect(mutator.get('controller.child.age')).toBe(2321);
        expect(mutator.get('controller.start')).toBe(2);
        expect(mutator.get('controller.score')).toBe(4);
      });
    });

    describe('arrays of length 2', function () {
      it('should do nothing if first element of array is not string', function () {
        mutator.mutate([123, 'controller.child.age']);
        mutator.applyPendingMerges();
        expect(mutator.get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is undefined', function () {
        mutator.mutate(['controller.child.age', undefined]);
        mutator.applyPendingMerges();
        expect(mutator.get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is null', function () {
        mutator.mutate(['controller.child.age', null]);
        mutator.applyPendingMerges();
        expect(mutator.get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is empty hash', function () {
        mutator.mutate(['controller.child.age', {}]);
        mutator.applyPendingMerges();
        expect(mutator.get('controller.child.age')).toBe(5);
      });

      it('should unwrap dot strings into objects', function () {
        mutator.mutate(['controller.child.age', 123]);
        mutator.applyPendingMerges();
        expect(mutator.get('controller.child.age')).toBe(123);
      });

      it('should work where the second argument is an array', function () {
        mutator.mutate(['controller.list', [1, 2, 3]]);
        mutator.applyPendingMerges();
        expect(mutator.get('controller.list')).toEqual([1, 2, 3]);
      });
    });
  });

  describe('specific error scenarios', () => {
    beforeEach(() => {
      mutator.mutate([ 'players+', {
        id: 1, pacman: { position: { x: 100, y: 100 } }
      }]);

      mutator.applyPendingMerges();
    });

    it('should not crash with entry.get is not a function', () => {
      mutator.mutate([['players:1.pacman.position', { x: 208, y: 368 }]] );

      mutator.applyPendingMerges();
    });
  });
});