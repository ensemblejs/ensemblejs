'use strict';

var sinon = require('sinon');
var expect = require('expect');

var onChangeOf = sinon.spy();

var tracker = {
  for: function () {
    return {
      onChangeOf: onChangeOf
    };
  }
};
sinon.spy(tracker, 'for');

var updatedCallback = sinon.spy();
var physicsSystem = {
  create: sinon.spy(),
  updated: function () { return updatedCallback; }
};
sinon.spy(physicsSystem, 'updated');

var state = { position: { x: 4, y: 5} };
var stateAccess = {
  for: function () {
    return {
      unwrap: function () {
        return state;
      }
    };
  }
};

var makeTestible = require('../../support').makeTestible;

var game = { id: 2 };

describe('physics autobinding', function () {
  describe('a physics map with one source key', function () {
    var physicsMap;

    beforeEach(function () {
      physicsMap = {
        'key': ['source.state']
      };

      var loader = makeTestible('core/server/physics-system-loader', {
        PhysicsMap: physicsMap,
        StateTracker: tracker,
        PhysicsSystem: physicsSystem,
        StateAccess: stateAccess
      });

      tracker.for.reset();
      physicsSystem.create.reset();
      physicsSystem.updated.reset();
      onChangeOf.reset();

      loader[0](game);
    });

    it('should pass the source state to the physics system', function () {
      expect(physicsSystem.create.firstCall.args).toEqual(['key', {
        position: {x: 4, y: 5}
      }]);
    });

    it('should setup a trigger binding to wire the source changes with the physics system', function () {
      expect(tracker.for.firstCall.args).toEqual([2]);
      expect(physicsSystem.updated.firstCall.args).toEqual(['key']);
      expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
    });
  });

  describe('a physics map with multiple source key', function () {
    var physicsMap;

    beforeEach(function () {
      physicsMap = {
        'key': ['source.state', 'different.state']
      };

      var loader = makeTestible('core/server/physics-system-loader', {
        PhysicsMap: physicsMap,
        StateTracker: tracker,
        PhysicsSystem: physicsSystem,
        StateAccess: stateAccess
      });

      tracker.for.reset();
      physicsSystem.create.reset();
      physicsSystem.updated.reset();
      onChangeOf.reset();

      loader[0](game);
    });

    it('should pass the source state to the physics system', function () {
      expect(physicsSystem.create.firstCall.args).toEqual(['key', {
        position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.create.secondCall.args).toEqual(['key', {
        position: {x: 4, y: 5}
      }]);
    });

    it('should setup a trigger binding to wire the source changes with the physics system', function () {
      expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      expect(onChangeOf.secondCall.args).toEqual(['different.state', updatedCallback]);
    });
  });

  describe('a physics map with multiple keys', function () {
    var physicsMap;

    beforeEach(function () {
      physicsMap = {
        'keyA': ['source.state'],
        'keyB': ['different.state']
      };

      var loader = makeTestible('core/server/physics-system-loader', {
        PhysicsMap: physicsMap,
        StateTracker: tracker,
        PhysicsSystem: physicsSystem,
        StateAccess: stateAccess
      });

      tracker.for.reset();
      physicsSystem.create.reset();
      physicsSystem.updated.reset();
      onChangeOf.reset();

      loader[0](game);
    });

    it('should pass the source state to the physics system', function () {
      expect(physicsSystem.create.firstCall.args).toEqual(['keyA', {
        position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.create.secondCall.args).toEqual(['keyB', {
        position: {x: 4, y: 5}
      }]);
    });

    it('should setup a trigger binding to wire the source changes with the physics system', function () {
      expect(physicsSystem.updated.firstCall.args).toEqual(['keyA']);
      expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      expect(physicsSystem.updated.secondCall.args).toEqual(['keyB']);
      expect(onChangeOf.secondCall.args).toEqual(['different.state', updatedCallback]);
    });
  });

  describe('a physics map with static objects', function () {
    var physicsMap;

    beforeEach(function () {
      physicsMap = {
        'keyA': [{ position: { x: -100, y: -100}, width: 700, height: 100}]
      };

      var loader = makeTestible('core/server/physics-system-loader', {
        PhysicsMap: physicsMap,
        StateTracker: tracker,
        PhysicsSystem: physicsSystem,
        StateAccess: stateAccess
      });

      tracker.for.reset();
      physicsSystem.create.reset();
      physicsSystem.updated.reset();
      onChangeOf.reset();

      loader[0](game);
    });

    it('should pass the source state to the physics system', function () {
      expect(physicsSystem.create.firstCall.args).toEqual(['keyA', { position: { x: -100, y: -100}, width: 700, height: 100}
      ]);
    });

    it('should NOT setup a trigger binding', function () {
      expect(physicsSystem.updated.called).toEqual(false);
      expect(onChangeOf.called).toEqual(false);
    });
  });
});