'use strict';

const expect = require('expect');
const makeTestible = require('../../support').makeTestible;
import Immutable from 'immutable';

const double = (thing) => ({ x: thing.get('x') * 2, y: thing.get('y') * 2 });

describe('the physics system', function () {
  let physicsSystem;

  describe('registering objects', function () {
    beforeEach(function () {
      physicsSystem = makeTestible('core/shared/physics-system')[0];
    });

    it('should partition objects by game', function () {
      physicsSystem.register(1, 'pKey', 'source', Immutable.fromJS({ x: 1, y: 2}));
      physicsSystem.register(2, 'pKey', 'source', Immutable.fromJS({ x: 3, y: 4}));

      expect(physicsSystem.getByPhysicsKey(1, 'pKey')).toEqual([{x: 1, y: 2}]);
      expect(physicsSystem.getByPhysicsKey(2, 'pKey')).toEqual([{x: 3, y: 4}]);
    });

    it('should store the object using the physics key', function () {
      physicsSystem.register(1, 'pKeyA', 'sourceA', Immutable.fromJS({x: 1, y: 2}));

      expect(physicsSystem.getByPhysicsKey(1, 'pKeyA')).toEqual([{x:1, y:2}]);
    });

    it('should store the object using the source key', function () {
      physicsSystem.register(1, 'pKeyA', 'sourceA', Immutable.fromJS({x: 1, y: 2}));

      expect(physicsSystem.getBySourceKey(1, 'sourceA')).toEqual({x:1, y:2});
    });

    it('should handle multiple objects registered against a single physics key', function () {
      physicsSystem.register(1, 'pKeyC', 'sourceA', Immutable.fromJS({x: 1, y: 2}));
      physicsSystem.register(1, 'pKeyC', 'sourceB', Immutable.fromJS({x: 3, y: 4}));

      expect(physicsSystem.getByPhysicsKey(1, 'pKeyC')).toEqual([
        {x:1, y:2}, {x:3, y:4}
      ]);
      expect(physicsSystem.getBySourceKey(1, 'sourceA')).toEqual({x:1, y:2});
      expect(physicsSystem.getBySourceKey(1, 'sourceB')).toEqual({x:3, y:4});
    });
  });

  describe('updating objects', function () {
    beforeEach(function () {
      physicsSystem = makeTestible('core/shared/physics-system')[0];
      physicsSystem.register(1, 'pKeyD', 'sourceD', Immutable.fromJS({x: 1, y: 2}));
    });

    it('should return an update function given a game and source key', function () {
      expect(physicsSystem.updated(1, 'pKeyD')).toBeA(Function);
    });

    describe('the update function', function () {
      let f1, f2;
      beforeEach(function () {
        physicsSystem.register(1, 'pKeyE', 'sourceE', Immutable.fromJS({x: 1, y: 2}));
        physicsSystem.register(2, 'pKeyE', 'sourceE', Immutable.fromJS({x: 1, y: 2}));
        f1 = physicsSystem.updated(1, 'sourceE');
        f2 = physicsSystem.updated(2, 'sourceE', double);
      });

      it('should update the current state', function () {
        f1(Immutable.fromJS({x: 6, y: 7}));

        expect(physicsSystem.getByPhysicsKey(1, 'pKeyE')).toEqual([{x:6, y:7}]);
        expect(physicsSystem.getBySourceKey(1, 'sourceE')).toEqual({x:6, y:7});
      });

      it('should adapt the new state when there is an adapter', function () {
        f2(Immutable.fromJS({x: 6, y: 7}));

        expect(physicsSystem.getByPhysicsKey(2, 'pKeyE')).toEqual([{x:12, y:14}]);
        expect(physicsSystem.getBySourceKey(2, 'sourceE')).toEqual({x:12, y:14});
      });
    });
  });

  describe('array functions', function () {
    let add, change, remove, addD, changeD;

    beforeEach(function () {
      physicsSystem = makeTestible('core/shared/physics-system')[0];
      add = physicsSystem.added(1, 'pArray', 'srcArray');
      addD = physicsSystem.added(1, 'pArray2', 'srcArray2', double);
      change = physicsSystem.changed(1, 'pArray', 'srcArray');
      changeD = physicsSystem.changed(1, 'pArray', 'srcArray', double);
      remove = physicsSystem.removed(1, 'pArray', 'srcArray');
    });

    describe('adding elements', function () {
      beforeEach(function () {
        add(10, Immutable.fromJS({id: 10, x: 3, y: 5}));
        addD(11, Immutable.fromJS({id: 11, x: 3, y: 5}));
      });

      afterEach(function () {
        remove(10);
      });

      it('should return an add function', function () {
        expect(add).toBeA(Function);
      });

      it('should add the element', function () {
        expect(physicsSystem.getByPhysicsKey(1, 'pArray')).toEqual([{id: 10, x: 3, y: 5}]);
        expect(physicsSystem.getBySourceKey(1, 'srcArray')).toEqual([{id: 10, x: 3, y: 5}]);
      });

      it('should adapt the new state when there is an adapter', function () {
        expect(physicsSystem.getByPhysicsKey(1, 'pArray2')[0]).toEqual({id: 11, x: 6, y: 10});
      });
    });

    describe('modifying elements', function () {
      beforeEach(function () {
        add(40, Immutable.fromJS({id: 40, x: 3, y: 5}));
      });

      afterEach(function () {
        remove(40);
      });

      it('should return a change function', function () {
        expect(change).toBeA(Function);
      });

      it('should modify the element the element', function () {
        change(40, Immutable.fromJS({id: 40, x: 6, y: 1}));

        expect(physicsSystem.getByPhysicsKey(1, 'pArray')).toEqual([{id: 40, x: 6, y: 1}]);
        expect(physicsSystem.getBySourceKey(1, 'srcArray')).toEqual([{id: 40, x: 6, y: 1}]);
      });

      it('should adapt the new state when there is an adapter', function () {
        changeD(40, Immutable.fromJS({id: 40, x: 6, y: 1}));

        expect(physicsSystem.getByPhysicsKey(1, 'pArray')).toEqual([{id: 40, x: 12, y: 2}]);
        expect(physicsSystem.getBySourceKey(1, 'srcArray')).toEqual([{id: 40, x: 12, y: 2}]);
      });
    });

    describe('removing elements', function () {
      it('should return a remove function', function () {
        expect(remove).toBeA(Function);
      });

      describe('the remove function', function () {
        beforeEach(function () {
          add(15, Immutable.fromJS({id: 15, x: 1, y: 2}));
          add(25, Immutable.fromJS({id: 25, x: 3, y: 4}));
        });

        it('should remove the current state', function () {
          remove(15);

          expect(physicsSystem.getByPhysicsKey(1, 'pArray')).toEqual([{id: 25, x: 3, y: 4}]);
          expect(physicsSystem.getBySourceKey(1, 'srcArray')).toEqual([{id: 25, x: 3, y: 4}]);

          remove(25);

          expect(physicsSystem.getByPhysicsKey(1, 'pArray')).toEqual([]);
          expect(physicsSystem.getBySourceKey(1, 'srcArray')).toEqual([]);
        });
      });
    });
  });
});