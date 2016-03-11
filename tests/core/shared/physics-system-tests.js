'use strict';

var expect = require('expect');
var makeTestible = require('../../support').makeTestible;

describe('the physics system', function () {
  var physicsSystem;

  describe('registering objects', function () {
    beforeEach(function () {
      physicsSystem = makeTestible('core/shared/physics-system')[0];
    });

    it('should partition objects by game', function () {
      physicsSystem.register(1, 'pKey', 'source', { x: 1, y: 2});
      physicsSystem.register(2, 'pKey', 'source', { x: 3, y: 4});

      expect(physicsSystem.getByPhysicsKey(1, 'pKey')).toEqual([{x: 1, y: 2}]);
      expect(physicsSystem.getByPhysicsKey(2, 'pKey')).toEqual([{x: 3, y: 4}]);
    });

    it('should store the object using the physics key', function () {
      physicsSystem.register(1, 'pKeyA', 'sourceA', {x: 1, y: 2});

      expect(physicsSystem.getByPhysicsKey(1, 'pKeyA')).toEqual([{x:1, y:2}]);
    });

    it('should store the object using the source key', function () {
      physicsSystem.register(1, 'pKeyA', 'sourceA', {x: 1, y: 2});

      expect(physicsSystem.getBySourceKey(1, 'sourceA')).toEqual({x:1, y:2});
    });

    it('should handle multiple objects registered against a single physics key', function () {
      physicsSystem.register(1, 'pKeyC', 'sourceA', {x: 1, y: 2});
      physicsSystem.register(1, 'pKeyC', 'sourceB', {x: 3, y: 4});

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
      physicsSystem.register(1, 'pKeyD', 'sourceD', {x: 1, y: 2});
    });

    it('should return an update function given a game and source key', function () {
      expect(physicsSystem.updated(1, 'pKeyD')).toBeA(Function);
    });

    describe('the update function', function () {
      var f;
      beforeEach(function () {
        physicsSystem.register(1, 'pKeyE', 'sourceE', {x: 1, y: 2});
        f = physicsSystem.updated(1, 'sourceE');
      });

      it('should update the current state', function () {
        f({x: 6, y: 7});

        expect(physicsSystem.getByPhysicsKey(1, 'pKeyE')).toEqual([{x:6, y:7}]);
        expect(physicsSystem.getBySourceKey(1, 'sourceE')).toEqual({x:6, y:7});
      });
    });
  });

  describe('array functions', function () {
    var add, change, remove;

    beforeEach(function () {
      physicsSystem = makeTestible('core/shared/physics-system')[0];
      add = physicsSystem.added(1, 'pArray', 'srcArray');
      change = physicsSystem.changed(1, 'pArray', 'srcArray');
      remove = physicsSystem.removed(1, 'pArray', 'srcArray');
    });

    describe('adding elements', function () {
      beforeEach(function () {
        add(10, {id: 10, x: 3, y: 5});
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
    });

    describe('modifying elements', function () {
      beforeEach(function () {
        add(40, {id: 40, x: 3, y: 5});
      });

      afterEach(function () {
        remove(40);
      });

      it('should return a change function', function () {
        expect(change).toBeA(Function);
      });

      it('should modify the element the element', function () {
        change(40, {id: 40, x: 6, y: 1});

        expect(physicsSystem.getByPhysicsKey(1, 'pArray')).toEqual([{id: 40, x: 6, y: 1}]);
        expect(physicsSystem.getBySourceKey(1, 'srcArray')).toEqual([{id: 40, x: 6, y: 1}]);
      });
    });

    describe('removing elements', function () {
      it('should return a remove function', function () {
        expect(remove).toBeA(Function);
      });

      describe('the remove function', function () {
        beforeEach(function () {
          add(15, {id: 15, x: 1, y: 2});
          add(25, {id: 25, x: 3, y: 4});
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