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
  register: sinon.spy(),
  tick: sinon.spy(),
  updated: function () { return updatedCallback; }
};
sinon.spy(physicsSystem, 'updated');

var state = {
  'source.state': {position: { x: 4, y: 5}},
  'different.state': {position: { x: 4, y: 5}},
  'second.state': {position: { x: 24, y: 35}}
};
var stateAccess = {
  for: function () {
    return {
      unwrap: function (key) {
        return state[key];
      }
    };
  }
};
var scopedState = {
  unwrap: function (key) {
    return state[key];
  }
};

var makeTestible = require('../../support').makeTestible;

var game = { id: 2, mode: 'game' };

describe('physics system bridge', function () {
  describe('on game ready', function () {
    describe('a physics map with one source key', function () {
      beforeEach(function () {
        var physicsMap = ['*', {
          'key': ['source.state']
        }];

        var bridge = makeTestible('core/server/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        tracker.for.reset();
        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnGameReady()(game);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['2', 'key', 'source.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(tracker.for.firstCall.args).toEqual([2]);
        expect(physicsSystem.updated.firstCall.args).toEqual(['2', 'key']);
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      });
    });

    describe('a physics map with multiple source key', function () {
      beforeEach(function () {
        var physicsMap = ['*', {
          'key': ['source.state', 'different.state']
        }];

        var bridge = makeTestible('core/server/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        tracker.for.reset();
        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnGameReady()(game);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['2', 'key', 'source.state', {
          position: {x: 4, y: 5}
        }]);
        expect(physicsSystem.register.secondCall.args).toEqual(['2', 'key', 'different.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
        expect(onChangeOf.secondCall.args).toEqual(['different.state', updatedCallback]);
      });
    });

    describe('a physics map with multiple keys', function () {
      beforeEach(function () {
        var physicsMap = ['*', {
          'keyA': ['source.state'],
          'keyB': ['different.state']
        }];

        var bridge = makeTestible('core/server/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        tracker.for.reset();
        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnGameReady()(game);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['2', 'keyA', 'source.state', {
          position: {x: 4, y: 5}
        }]);
        expect(physicsSystem.register.secondCall.args).toEqual(['2', 'keyB', 'different.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(physicsSystem.updated.firstCall.args).toEqual(['2', 'keyA']);
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
        expect(physicsSystem.updated.secondCall.args).toEqual(['2', 'keyB']);
        expect(onChangeOf.secondCall.args).toEqual(['different.state', updatedCallback]);
      });
    });

    describe('a physics map with static objects', function () {
      beforeEach(function () {
        var physicsMap = ['*', {
          'keyA': [{ position: { x: -100, y: -100}, width: 700, height: 100}]
        }];

        var bridge = makeTestible('core/server/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        tracker.for.reset();
        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnGameReady()(game);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['2', 'keyA', 'static3', { position: { x: -100, y: -100}, width: 700, height: 100}
        ]);
      });

      it('should NOT setup a trigger binding', function () {
        expect(physicsSystem.updated.called).toEqual(false);
        expect(onChangeOf.called).toEqual(false);
      });
    });

    describe('dealing with modes', function () {
      beforeEach(function () {
        var map1 = ['*', {'key1': ['source.state'] }];
        var map2 = ['arcade', {'key2': ['source.state'] }];
        var map3 = ['endless', {'key3': ['source.state'] }];

        var bridge = makeTestible('core/server/physics-system-bridge', {
          PhysicsMap: [map1, map2, map3],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        tracker.for.reset();
        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnGameReady()({id: 2, mode: 'arcade'});
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['2', 'key1', 'source.state', {
          position: {x: 4, y: 5}
        }]);
        expect(physicsSystem.register.secondCall.args).toEqual(['2', 'key2', 'source.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(tracker.for.firstCall.args).toEqual([2]);
        expect(physicsSystem.updated.firstCall.args).toEqual(['2', 'key1']);
        expect(physicsSystem.updated.secondCall.args).toEqual(['2', 'key2']);
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      });
    });
  });

  describe('dealing with multiple games', function () {
    beforeEach(function () {
      var map1 = ['*', {'key1': ['source.state'] }];
      var map2 = ['*', {'key2': ['source.state'] }];

      var bridge = makeTestible('core/server/physics-system-bridge', {
        PhysicsMap: [map1, map2],
        StateTracker: tracker,
        PhysicsSystem: physicsSystem,
        StateAccess: stateAccess
      });

      tracker.for.reset();
      physicsSystem.register.reset();
      physicsSystem.updated.reset();
      onChangeOf.reset();

      bridge[1].OnGameReady()({id: 1, mode: 'arcade'});
      bridge[1].OnGameReady()({id: 2, mode: 'arcade'});
    });

    it('should pass the source state to the physics system', function () {
      expect(physicsSystem.register.firstCall.args).toEqual(['1', 'key1', 'source.state', { position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.register.secondCall.args).toEqual(['1', 'key2', 'source.state', { position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.register.thirdCall.args).toEqual(['2', 'key1', 'source.state', { position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.register.lastCall.args).toEqual(['2', 'key2', 'source.state', { position: {x: 4, y: 5}
      }]);
    });

    it('should setup a trigger binding to wire the source changes with the physics system', function () {
      expect(tracker.for.firstCall.args).toEqual([1]);
      expect(tracker.for.secondCall.args).toEqual([1]);
      expect(tracker.for.thirdCall.args).toEqual([2]);
      expect(tracker.for.lastCall.args).toEqual([2]);
      expect(physicsSystem.updated.firstCall.args).toEqual(['1', 'key1']);
      expect(physicsSystem.updated.secondCall.args).toEqual(['1', 'key2']);
      expect(physicsSystem.updated.thirdCall.args).toEqual(['2', 'key1']);
      expect(physicsSystem.updated.lastCall.args).toEqual(['2', 'key2']);
      expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      expect(onChangeOf.secondCall.args).toEqual(['source.state', updatedCallback]);
    });
  });

  describe('on physics frame', function () {
    var bridge;

    beforeEach(function () {
      var physicsMap = ['*', {
        'key': ['source.state']
      }];

      bridge = makeTestible('core/client/physics-system-bridge', {
        PhysicsMap: [physicsMap],
        StateTracker: tracker,
        PhysicsSystem: physicsSystem,
        StateAccess: stateAccess
      });

      physicsSystem.tick.reset();
    });

    it('should call tick on the physics system', function () {
      bridge[1].OnPhysicsFrame()(scopedState, 0.15);

      expect(physicsSystem.tick.firstCall.args).toEqual([0.15]);
    });

    describe('when nothing is returned', function () {
      it('should return nothing', function () {
        expect(bridge[1].OnPhysicsFrame()(scopedState, 0.15)).toEqual(undefined);
      });
    });

    describe('when physics object changes are returned', function () {
      beforeEach(function () {
        physicsSystem.get = function () {
          return {
            position: { x: 14, y: 45, ignored: true},
            alsoIgnored: 'yes'
          };
        };
        physicsSystem.tick = function () {
          return ['source.state'];
        };
      });

      afterEach(function () {
        physicsSystem.tick = sinon.spy();
      });

      describe('simple objects', function () {
        it('should update the state models with the new physics values', function () {
          expect(bridge[1].OnPhysicsFrame()(scopedState, 0.15)).toEqual({
            source: {
              state: {
                position: { x: 14, y: 45 }
              }
            }
          });
        });
      });

      describe('composite objects', function () {
        beforeEach(function () {
          physicsSystem.tick = function () {
            return ['source.state', 'second.state'];
          };
        });

        it('should be able to handle keys that match arrays', function () {
          expect(bridge[1].OnPhysicsFrame()(scopedState, 0.15)).toEqual({
            source: {
              state: {
                position: { x: 14, y: 45 }
              }
            },
            second: {
              state: {
                position: { x: 14, y: 45 }
              }
            }
          });
        });
      });
    });
  });
});