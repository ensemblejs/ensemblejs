'use strict';

var sinon = require('sinon');
var expect = require('expect');
var isFunction = require('lodash').isFunction;

var onChangeOf = sinon.spy();
var onElementAdded = sinon.spy();
var onElementChanged = sinon.spy();
var onElementRemoved = sinon.spy();

var tracker = {
  for: function () {
    return {
      onChangeOf: onChangeOf,
      onElementAdded: onElementAdded,
      onElementChanged: onElementChanged,
      onElementRemoved: onElementRemoved
    };
  }
};
sinon.spy(tracker, 'for');

var updatedCallback = sinon.spy();
var addedCallback = sinon.spy();
var changedCallback = sinon.spy();
var removedCallback = sinon.spy();
var physicsSystem = {
  tick: sinon.spy(),
  register: sinon.spy(),
  updated: function () { return updatedCallback; },
  added: function () { return addedCallback; },
  changed: function () { return changedCallback; },
  removed: function () { return removedCallback; }
};
sinon.spy(physicsSystem, 'updated');
sinon.spy(physicsSystem, 'added');
sinon.spy(physicsSystem, 'changed');
sinon.spy(physicsSystem, 'removed');

var state = {
  'source.state': {position: { x: 4, y: 5}},
  'different.state': {position: { x: 4, y: 5}},
  'second.state': {position: { x: 24, y: 35}},
  'array.state': [
    {id: 1, position: { x: 24, y: 35}},
    {id: 2, position: { x: 43, y: 23}}
  ],
  'array.empty': []
};
var objState = {
  array: {
    state: [
      {id: 1, position: { x: 24, y: 35}},
      {id: 2, position: { x: 43, y: 23}}
    ]
  }
};
var stateAccess = {
  for: function () {
    return {
      get: (key) => isFunction(key) ? key(objState) : state[key]
    };
  }
};
var scopedState = {
  source: {
    state: {position: { x: 4, y: 5}}
  },
  different: {
    state: {position: { x: 4, y: 5}}
  },
  second: {
    state: {position: { x: 24, y: 35}}
  },
  array: {
    state: [
      {id: 1, position: { x: 24, y: 35}},
      {id: 2, position: { x: 43, y: 23}}
    ],
    empty: []
  }
};

var makeTestible = require('../../support').makeTestible;

var save = { id: 2, mode: 'save' };

describe('physics system bridge (on the server)', function () {
  describe('OnStateTrackerReady', function () {
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

        bridge[1].OnStateTrackerReady()(save);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual([2, 'key', 'source.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(tracker.for.firstCall.args).toEqual([2]);
        expect(physicsSystem.updated.firstCall.args).toEqual([2, 'source.state', undefined]);
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      });
    });

    describe('a physics map with a source key that points to an array', function () {

      beforeEach(function () {
        var physicsMap = ['*', {
          'key': ['array.state', 'array.empty']
        }];

        var bridge = makeTestible('core/server/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onElementAdded.reset();
        onElementChanged.reset();
        onElementRemoved.reset();

        bridge[1].OnStateTrackerReady()(save);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(onElementAdded.firstCall.args).toEqual(['array.state', addedCallback]);
        expect(onElementAdded.secondCall.args).toEqual(['array.empty', addedCallback]);
        expect(onElementChanged.firstCall.args).toEqual(['array.state', updatedCallback]);
        expect(onElementChanged.secondCall.args).toEqual(['array.empty', updatedCallback]);
        expect(onElementRemoved.firstCall.args).toEqual(['array.state', removedCallback]);
        expect(onElementRemoved.secondCall.args).toEqual(['array.empty', removedCallback]);

        expect(physicsSystem.added.firstCall.args).toEqual([2, 'key', 'array.state', undefined]);
        expect(physicsSystem.added.secondCall.args).toEqual([2, 'key', 'array.empty', undefined]);

        expect(physicsSystem.changed.firstCall.args).toEqual([2, 'key', 'array.state', undefined]);
        expect(physicsSystem.changed.secondCall.args).toEqual([2, 'key', 'array.empty', undefined]);

        expect(physicsSystem.removed.firstCall.args).toEqual([2, 'key', 'array.state']);
        expect(physicsSystem.removed.secondCall.args).toEqual([2, 'key', 'array.empty']);
      });
    });

    describe('a physics map with a source key and a via function', function () {
      function pluckPosition (thing) {
        return thing.position;
      }

      function lens (s) {
        return [s.array.state[0]];
      }

      beforeEach(function () {
        var physicsMap = ['*', {
          'keyA': [{sourceKey: 'array.state', via: pluckPosition}],
          'keyB': [{sourceKey: 'source.state', via: pluckPosition}],
          'keyC': [lens]
        }];

        var bridge = makeTestible('core/server/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        physicsSystem.added.reset();
        physicsSystem.changed.reset();
        physicsSystem.removed.reset();
        onElementAdded.reset();
        onElementChanged.reset();
        onElementRemoved.reset();

        bridge[1].OnStateTrackerReady()(save);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual([2, 'keyB', 'source.state', {x: 4, y: 5}
        ]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(physicsSystem.added.firstCall.args).toEqual([2, 'keyA', 'array.state', pluckPosition]);

        expect(physicsSystem.changed.firstCall.args).toEqual([2, 'keyA', 'array.state', pluckPosition]);

        expect(physicsSystem.removed.firstCall.args).toEqual([2, 'keyA', 'array.state']);

        expect(physicsSystem.updated.firstCall.args).toEqual([2, 'source.state', pluckPosition]);

        expect(physicsSystem.added.secondCall.args).toEqual([2, 'keyC', 'keyC-2', undefined]);

        expect(physicsSystem.changed.secondCall.args).toEqual([2, 'keyC', 'keyC-2', undefined]);

        expect(physicsSystem.removed.secondCall.args).toEqual([2, 'keyC', 'keyC-2']);
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

        bridge[1].OnStateTrackerReady()(save);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual([2, 'key', 'source.state', {
          position: {x: 4, y: 5}
        }]);
        expect(physicsSystem.register.secondCall.args).toEqual([2, 'key', 'different.state', {
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

        bridge[1].OnStateTrackerReady()(save);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual([2, 'keyA', 'source.state', {
          position: {x: 4, y: 5}
        }]);
        expect(physicsSystem.register.secondCall.args).toEqual([2, 'keyB', 'different.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(physicsSystem.updated.firstCall.args).toEqual([2, 'source.state', undefined]);
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
        expect(physicsSystem.updated.secondCall.args).toEqual([2, 'different.state', undefined]);
        expect(onChangeOf.secondCall.args).toEqual(['different.state', updatedCallback]);
      });
    });

    describe('a physics map with static objects', function () {
      beforeEach(function () {
        function positionOnly (thing) {
          return thing.position;
        }

        var physicsMap = ['*', {
          'keyA': [{ position: { x: -100, y: -100}, width: 700, height: 100}],
          'keyB': [{ position: { x: -100, y: -100}, width: 700, height: 100, via: positionOnly}]
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
        onElementAdded.reset();
        onElementChanged.reset();
        onElementRemoved.reset();

        bridge[1].OnStateTrackerReady()(save);
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual([2, 'keyA', 'static1', { position: { x: -100, y: -100}, width: 700, height: 100}
        ]);
        expect(physicsSystem.register.secondCall.args).toEqual([2, 'keyB', 'static2', { x: -100, y: -100 }
        ]);
      });

      it('should NOT setup a trigger binding', function () {
        expect(physicsSystem.updated.called).toEqual(false);
        expect(onChangeOf.called).toEqual(false);
        expect(onElementAdded.called).toEqual(false);
        expect(onElementChanged.called).toEqual(false);
        expect(onElementRemoved.called).toEqual(false);
      });
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

      bridge[1].OnStateTrackerReady()({id: 2, mode: 'arcade'});
    });

    it('should pass the source state to the physics system', function () {
      expect(physicsSystem.register.firstCall.args).toEqual([2, 'key1', 'source.state', {
        position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.register.secondCall.args).toEqual([2, 'key2', 'source.state', {
        position: {x: 4, y: 5}
      }]);
    });

    it('should setup a trigger binding to wire the source changes with the physics system', function () {
      expect(tracker.for.firstCall.args).toEqual([2]);
      expect(physicsSystem.updated.firstCall.args).toEqual([2, 'source.state', undefined]);
      expect(physicsSystem.updated.secondCall.args).toEqual([2, 'source.state', undefined]);
      expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
    });
  });

  describe('dealing with multiple saves', function () {
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

      bridge[1].OnStateTrackerReady()({id: 1, mode: 'arcade'});
      bridge[1].OnStateTrackerReady()({id: 2, mode: 'arcade'});
    });

    it('should pass the source state to the physics system', function () {
      expect(physicsSystem.register.firstCall.args).toEqual([1, 'key1', 'source.state', { position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.register.secondCall.args).toEqual([1, 'key2', 'source.state', { position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.register.thirdCall.args).toEqual([2, 'key1', 'source.state', { position: {x: 4, y: 5}
      }]);
      expect(physicsSystem.register.lastCall.args).toEqual([2, 'key2', 'source.state', { position: {x: 4, y: 5}
      }]);
    });

    it('should setup a trigger binding to wire the source changes with the physics system', function () {
      expect(tracker.for.firstCall.args).toEqual([1]);
      expect(tracker.for.secondCall.args).toEqual([1]);
      expect(tracker.for.thirdCall.args).toEqual([2]);
      expect(tracker.for.lastCall.args).toEqual([2]);
      expect(physicsSystem.updated.firstCall.args).toEqual([1, 'source.state', undefined]);
      expect(physicsSystem.updated.secondCall.args).toEqual([1, 'source.state', undefined]);
      expect(physicsSystem.updated.thirdCall.args).toEqual([2, 'source.state', undefined]);
      expect(physicsSystem.updated.lastCall.args).toEqual([2, 'source.state', undefined]);
      expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      expect(onChangeOf.secondCall.args).toEqual(['source.state', updatedCallback]);
    });
  });

  describe('on physics frame', function () {
    var bridge;

    var onPhysicsFrame;
    beforeEach(function () {
      var physicsMap = ['*', {
        'key': ['source.state']
      }];

      bridge = makeTestible('core/server/physics-system-bridge', {
        PhysicsMap: [physicsMap],
        StateTracker: tracker,
        PhysicsSystem: physicsSystem,
        StateAccess: stateAccess
      });

      onPhysicsFrame = bridge[1].OnPhysicsFrame();

      physicsSystem.tick.reset();
    });

    it('should call tick on the physics system', function () {
      onPhysicsFrame(0.15, scopedState);

      expect(physicsSystem.tick.firstCall.args).toEqual([0.15]);
    });

    describe('when nothing is returned', function () {
      it('should return nothing', function () {
        expect(onPhysicsFrame(0.15, scopedState)).toEqual(undefined);
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
          expect(onPhysicsFrame(0.15, scopedState)).toEqual({
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
          expect(onPhysicsFrame(0.15, scopedState)).toEqual({
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