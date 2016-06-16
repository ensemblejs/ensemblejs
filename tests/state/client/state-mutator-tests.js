'use strict';

const expect = require('expect');

import {plugin} from '../../../src/plugins/plug-n-play';
const defer = require('../../support').defer;
const logger = require('../../fake/logger');

const mutate = require('../../../src/state/client/mutator').func(defer(logger));
const state = plugin('StateAccess');

describe('state mutation on the client', function () {

  beforeEach(function () {
    mutate(1, {
      controller: {
        start: 0,
        score: 0,
        state: 'ready',
        list: [4],
        idList: [{id: 4}, {id: 3}],
        subPush: [{id: 5, arr: []}, {id: 6, arr: [{id:3}, {id: 4}]}],
        double: [{id: 4, value: 1}, {id: 3, value: 2}],
        child: {
          age: 5,
          siblings: {
            name: 'Geoff'
          }
        }
      }
    });

    mutate(12, {
      controller: {
        start: 0,
      }
    });
  });

  describe('simple behaviour', function () {
    it('should allow a single value to mutate', function () {
      mutate(1, {
        controller: {
          state: 'started',
          score: 0,
          child: {
            age: 123
          }
        }
      });

      expect(state.for().for('controller').get('state')).toBe('started');
      expect(state.for().for('controller').get('score')).toBe(0);
      expect(state.for().get('controller.child.age')).toBe(123);
    });

    it('should work with adding to arrays', function () {
      mutate(1, {
        controller: {
          list: [4, 3]
        }
      });

      expect(state.for().for('controller').get('list').toJS()).toEqual([4, 3]);
    });

    it('should work with removing elements from arrays', function () {
      mutate(1, {
        controller: {
          list: []
        }
      });

      expect(state.for().for('controller').get('list').toJS()).toEqual([]);
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
        mutate(1, ['controller.child.age', happyBirthday]);

        expect(state.for().get('controller.child.age')).toBe(6);
      });

      it('should work with adding to arrays', function () {
        mutate(1, ['controller.list', addItem]);

        expect(state.for().for('controller').get('list').toJS()).toEqual([4, 3]);
      });

      it('should work with removing elements from arrays', function () {
        mutate(1, ['controller.list', resetList]);

        expect(state.for().for('controller').get('list').toJS()).toEqual([]);
      });
    });

    describe('using shorthand notation', function () {
      beforeEach(() => {
        logger.error.reset();
      });

      it('should not support adding+ to arrays', function () {
        mutate(1, ['controller.list+', addItem]);

        expect(logger.error.callCount).toBe(1);
        expect(logger.error.firstCall.args[1]).toEqual('Using a function on the + operator is not supported. Remove the + operator to acheive desired effect.');
      });

      it('should not support removing- from arrays', function () {
        mutate(1, ['controller.idList-', addItem]);


        expect(logger.error.callCount).toBe(1);
        expect(logger.error.firstCall.args[1]).toEqual('Using a function on the - operator is not supported. Remove the - operator to acheive desired effect.');
      });

      it('should not support replacing! arrays', function () {
        mutate(1, ['controller.idList!', addItem]);


        expect(logger.error.callCount).toBe(1);
        expect(logger.error.firstCall.args[1]).toEqual('Using a function on the ! operator is not supported. Remove the ! operator to acheive desired effect.');
      });

      it('should support modifying: arrays', function () {
        function addN (item) {
          expect(item).toEqual({id: 4});

          item.n = 'h';
          return item;
        }
        mutate(1, ['controller.idList:4', addN]);

        expect(state.for().for('controller').get('idList').toJS()).toEqual([
          {id: 4, n: 'h'},
          {id: 3}
        ]);
      });

      it('should support modifying arrays children', function () {
        function makeNZ (item) {
          expect(item).toBe(undefined);

          return 'z';
        }

        mutate(1, ['controller.idList:4.n', makeNZ]);

        expect(state.for().for('controller').get('idList').toJS()).toEqual([
          {id: 4, n: 'z'},
          {id: 3}
        ]);
      });
    });
  });

  describe('using shorthand notation', function () {
    it('should support adding+ to arrays', function () {
      mutate(1, ['controller.list+', 3]);

      expect(state.for().for('controller').get('list').toJS()).toEqual([4, 3]);
    });

    it('should support adding+ to arrays of arrays', function () {
      mutate(1, ['controller.subPush:5.arr+', 5]);

      expect(state.for().get('controller.subPush:5.arr').toJS()).toEqual([5]);
    });

    it('should support removing- from arrays', function () {
      mutate(1, ['controller.idList-', {id: 4}]);

      expect(state.for().for('controller').get('idList').toJS()).toEqual([{id: 3}]);
    });

    it('should support removing- from arrays of arrays', function () {
      mutate(1, ['controller.subPush:6.arr-', {id :3}]);

      expect(state.for().get('controller.subPush:6.arr').toJS()).toEqual([{id:4}]);
    });

    it('should support replacing! arrays', function () {
      mutate(1, ['controller.idList!', {id: 4, n: 'a'}]);

      expect(state.for().for('controller').get('idList').toJS()).toEqual([
        {id: 4, n: 'a'},
        {id: 3}
      ]);
    });

    it('should support modifying! arrays of arrays', function () {
      mutate(1, ['controller.subPush:6.arr!', {id :3, derp: true}]);

      expect(state.for().get('controller.subPush:6.arr').toJS()).toEqual([{id :3, derp: true}, {id: 4}]);
    });

    it('should support modifying: arrays', function () {
      mutate(1, ['controller.idList:4', {n: 'h'}]);

      expect(state.for().for('controller').get('idList').toJS()).toEqual([
        {id: 4, n: 'h'},
        {id: 3}
      ]);
    });

    it('should support modifying arrays children', function () {
      mutate(1, ['controller.idList:4.n', 'z']);

      expect(state.for().for('controller').get('idList').toJS()).toEqual([
        {id: 4, n: 'z'},
        {id: 3}
      ]);
    });
  });

  describe('when you do not want to mutate state', function () {
    it('should do nothing with undefined', function () {
      mutate(1, undefined);
      expect(state.for().for('controller').get('state')).toBe('ready');
    });

    it('should do nothing with null', function () {
      mutate(1, null);
      expect(state.for().for('controller').get('state')).toBe('ready');
    });

    it('should do nothing with empty hashes', function () {
      mutate(1, {});
      expect(state.for().for('controller').get('state')).toBe('ready');
    });
  });

  describe('arrays of arrays', function () {
    describe('arrays not of length 2', function () {
      it('should ignore anything that is not an array of arrays', function () {
        mutate(1, []);
        mutate(1, ['controller.child.age']);
        mutate(1, ['controller.child.age', 123, 'third']);

        expect(state.for().get('controller.child.age')).toBe(5);
      });

      it('should process arrays of arrays if the subarray is length 2', function () {
        mutate(1, [['controller.child.age', 123]]);
        expect(state.for().get('controller.child.age')).toBe(123);

        mutate(1, [
          ['controller.child.age', 2321],
          ['controller.start', 2],
          ['controller.score', 4],
        ]);

        expect(state.for().get('controller.child.age')).toBe(2321);
        expect(state.for().get('controller.start')).toBe(2);
        expect(state.for().get('controller.score')).toBe(4);
      });
    });

    describe('arrays of length 2', function () {
      it('should do nothing if first element of array is not string', function () {
        mutate(1, [123, 'controller.child.age']);
        expect(state.for().get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is undefined', function () {
        mutate(1, ['controller.child.age', undefined]);
        expect(state.for().get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is null', function () {
        mutate(1, ['controller.child.age', null]);
        expect(state.for().get('controller.child.age')).toBe(5);
      });

      it('should do nothing if second element of array is empty hash', function () {
        mutate(1, ['controller.child.age', {}]);
        expect(state.for().get('controller.child.age')).toBe(5);
      });

      it('should unwrap dot strings into objects', function () {
        mutate(1, ['controller.child.age', 123]);
        expect(state.for().get('controller.child.age')).toBe(123);
      });
    });
  });
});