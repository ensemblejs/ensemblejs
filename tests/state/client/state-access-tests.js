'use strict';

var expect = require('expect');

import {plugin} from '../../../src/plugins/plug-n-play';
var defer = require('../../support').defer;
var fakeLogger = require('../../fake/logger');

var stateMutator = require('../../../src/state/client/mutator').func(defer(fakeLogger));
var state = plugin('StateAccess');
var afterPhysicsFrame = plugin('AfterPhysicsFrame');

import {read} from '../../../src/util/dot-string-support';

describe('state access on client', function () {
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

    afterPhysicsFrame();
  });

  it('should return the value you asked for', function () {
    expect(state.for().for('controller').get('start')).toEqual(0);
    expect(state.for().get('controller.start')).toEqual(0);
    expect(state.for().get('arrayOfThings').toJS()).toEqual([1,2,3]);
    expect(state.for().get('idArray:2.id')).toEqual(2);
    expect(state.for().get('idArray:2.c')).toEqual('d');
    expect(state.for().get('idArray:2.c')).toEqual('d');
    expect(state.for().get('idArray').toJS()).toEqual([{id: 1, c: 'b'}, {id: 2, c: 'd'}, {id: 3, c: 'f'}]);
    expect(state.for().get('idArray*.c').toJS()).toEqual(['b', 'd', 'f']);
  });

  it('should not allow mutable state on nested objects', function () {
    try {
      state.for().for('controller').get('child').age = 21;
    } catch (e) { console.log('ignored'); }
    try {
      state.for().get('controller.child').age = 21;
    } catch (e) { console.log('ignored'); }
    try {
      state.for().for('controller').get('child.siblings').name = 'Roger';
    } catch (e) { console.log('ignored'); }
    try {
      state.for().get('controller.child.siblings').name = 'Roger';
    } catch (e) { console.log('ignored'); }

    expect(state.for().for('controller').get('age')).toNotEqual(21);
    expect(state.for().for('controller').get('child.siblings.name')).toNotEqual('Roger');
  });

  describe('player data access', function () {
    it('should scope to the player number', function () {
      expect(state.for().player(1).for('controller').get('score')).toEqual(10);
      expect(state.for().player(2).for('controller').get('score')).toEqual(20);
      expect(state.for().player(3).for('controller').get('score')).toEqual(34);
    });

    it('should support dot-strings', function () {
      expect(state.for().player(1).get('controller.score')).toEqual(10);
      expect(state.for().player(2).get('controller.score')).toEqual(20);
      expect(state.for().player(3).get('controller.score')).toEqual(34);
    });
  });

  describe('objects can be converted to native JS objects', function () {
    it('should get objects', function () {
      expect(state.for().get('controller.child.siblings').toJS()).toEqual({ name: 'Geoff' });
    });

    it('should get lenses', function () {
      const lensA = (s) => s.toJS().controller.child.siblings;
      const lensB = (s) => s.get('controller').get('child').get('siblings');
      const lensC = (s) => read(s, 'controller.child.siblings');

      expect(state.for().get(lensA)).toEqual({ name: 'Geoff' });
      expect(state.for().get(lensB).toJS()).toEqual({ name: 'Geoff' });
      expect(state.for().get(lensC).toJS()).toEqual({ name: 'Geoff' });
    });

    it('should get by id', function () {
      expect(state.for().get('idArray:2').toJS()).toEqual({id: 2, c: 'd'});
    });

    it('should get by id with children', function () {
      expect(state.for().get('idArray:2.c')).toEqual('d');
    });

    it('should get array children', function () {
      expect(state.for().get('idArray*.c').toJS()).toEqual(['b', 'd', 'f']);
    });

    it('should get by id with sub id', function () {
      expect(state.for().get('sub:1.subsub:2.f')).toEqual('h');
    });

    it('should get arrays', function () {
      expect(state.for().get('arrayOfThings').toJS()).toEqual([1, 2, 3]);
    });

    it('should get nested objects', function () {
      expect(state.for().get('controller.child').toJS()).toEqual({
        age: 5,
        siblings: {
          name: 'Geoff'
        }
      });
    });

    it('should work for player data access', function () {
      expect(state.for().player(1).for('controller').get('score')).toEqual(10);
      expect(state.for().player(1).get('controller.score')).toEqual(10);
    });

    describe('immutable gets' , function () {
      it('should ignore literal changes', function () {
        let value = state.for().get('controller.start');
        value = 3;

        expect(state.for().get('controller.start')).toEqual(0);
      });

      it('should ignore object changes', function () {
        var value = state.for().get('controller.child.siblings').toJS();
        value.name = 'Roger';

        expect(state.for().get('controller.child.siblings').toJS()).toEqual({ name: 'Geoff' });
      });

      it('should ignore array changes', function () {
        var value = state.for().get('arrayOfThings');
        value.push(4);

        expect(state.for().get('arrayOfThings').toJS()).toEqual([1, 2, 3]);
      });

      it('should ignore nested object changes', function () {
        var value = state.for().get('controller.child').toJS();
        value.age = 6;
        value.siblings.banana = true;
        value.siblings.name = 'Roger';

        expect(state.for().get('controller.child').toJS()).toEqual({
          age: 5,
          siblings: {
            name: 'Geoff'
          }
        });
      });

      it('should work for player data access', function () {
        let value = state.for().player(1).for('controller').get('score');
        value = 30;

        expect(state.for().player(1).get('controller.score')).toEqual(10);
      });
    });
  });
});