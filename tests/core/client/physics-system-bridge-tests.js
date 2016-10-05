'use strict';

const sinon = require('sinon');
const expect = require('expect');
const isFunction = require('lodash').isFunction;

const onChangeOf = sinon.spy();
const onElementAdded = sinon.spy();
const onElementChanged = sinon.spy();
const onElementRemoved = sinon.spy();

const tracker = {
  onChangeOf,
  onElementAdded,
  onElementChanged,
  onElementRemoved
};

const updatedCallback = sinon.spy();
const addedCallback = sinon.spy();
const changedCallback = sinon.spy();
const removedCallback = sinon.spy();
const physicsSystem = {
  tick: sinon.spy(),
  register: sinon.spy(),
  updated: () => updatedCallback,
  added: () => addedCallback,
  changed: () => changedCallback,
  removed: () => removedCallback
};
sinon.spy(physicsSystem, 'updated');
sinon.spy(physicsSystem, 'added');
sinon.spy(physicsSystem, 'changed');
sinon.spy(physicsSystem, 'removed');

const state = {
  'source.state': {position: { x: 4, y: 5}},
  'different.state': {position: { x: 4, y: 5}},
  'second.state': {position: { x: 24, y: 35}},
  'array.state': [
    {id: 1, position: { x: 24, y: 35}},
    {id: 2, position: { x: 43, y: 23}}
  ],
  'array.empty': []
};
const objState = {
  array: {
    state: [
      {id: 1, position: { x: 24, y: 35}},
      {id: 2, position: { x: 43, y: 23}}
    ]
  }
};
const stateAccess = {
  for: () => ({
    get: (key) => isFunction(key) ? key(objState) : state[key]
  })
};
const scopedState = {
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

const defer = require('../../support').defer;
const makeTestible = require('../../support').makeTestible;

describe('physics system bridge (on the client)', function () {
  let sequenceStub;

  beforeEach(function () {
    const sequence = require('distributedlife-sequence');
    sequenceStub = sinon.stub(sequence, 'next').returns('1');
});

  afterEach(function () {
    sequenceStub.restore();
  });

  describe('on game ready', function () {
    describe('a physics map with one source key', function () {
      beforeEach(function () {
        const physicsMap = ['*', {
          'key': ['source.state']
        }];

        const bridge = makeTestible('core/client/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnClientReady(defer('game'))();
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['client', 'key', 'source.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(physicsSystem.updated.firstCall.args).toEqual(['client', 'source.state', undefined]);
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      });
    });

    describe('a physics map with a source key and a via function', function () {
      function pluckPosition (thing) {
        return thing.position;
      }

      function lens (s) {
        return [s.array.state[0].position];
      }

      beforeEach(function () {
        const physicsMap = ['*', {
          'keyA': [{sourceKey: 'array.state', via: pluckPosition}],
          'keyB': [{sourceKey: 'source.state', via: pluckPosition}],
          'keyC': [lens]
        }];

        const bridge = makeTestible('core/client/physics-system-bridge', {
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

        bridge[1].OnClientReady(defer('game'))();
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['client', 'keyB', 'source.state', {x: 4, y: 5}
        ]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(physicsSystem.added.firstCall.args).toEqual(['client', 'keyA', 'array.state', pluckPosition]);

        expect(physicsSystem.changed.firstCall.args).toEqual(['client', 'keyA', 'array.state', pluckPosition]);

        expect(physicsSystem.removed.firstCall.args).toEqual(['client', 'keyA', 'array.state']);

        expect(physicsSystem.updated.firstCall.args).toEqual(['client', 'source.state', pluckPosition]);

        expect(physicsSystem.added.secondCall.args).toEqual(['client', 'keyC', 'keyC-1', undefined]);

        expect(physicsSystem.changed.secondCall.args).toEqual(['client', 'keyC', 'keyC-1', undefined]);

        expect(physicsSystem.removed.secondCall.args).toEqual(['client', 'keyC', 'keyC-1']);
      });
    });

    describe('a physics map with a source key that points to an array', function () {
      beforeEach(function () {
        const physicsMap = ['*', {
          'key': ['array.state', 'array.empty']
        }];

        const bridge = makeTestible('core/client/physics-system-bridge', {
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

        bridge[1].OnClientReady(defer('game'))();
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(onElementAdded.firstCall.args).toEqual(['array.state', addedCallback]);
        expect(onElementAdded.secondCall.args).toEqual(['array.empty', addedCallback]);
        expect(onElementChanged.firstCall.args).toEqual(['array.state', updatedCallback]);
        expect(onElementChanged.secondCall.args).toEqual(['array.empty', updatedCallback]);
        expect(onElementRemoved.firstCall.args).toEqual(['array.state', removedCallback]);
        expect(onElementRemoved.secondCall.args).toEqual(['array.empty', removedCallback]);

        expect(physicsSystem.added.firstCall.args).toEqual(['client', 'key', 'array.state', undefined]);
        expect(physicsSystem.added.secondCall.args).toEqual(['client', 'key', 'array.empty', undefined]);

        expect(physicsSystem.changed.firstCall.args).toEqual(['client', 'key', 'array.state', undefined]);
        expect(physicsSystem.changed.secondCall.args).toEqual(['client', 'key', 'array.empty', undefined]);

        expect(physicsSystem.removed.firstCall.args).toEqual(['client', 'key', 'array.state']);
        expect(physicsSystem.removed.secondCall.args).toEqual(['client', 'key', 'array.empty']);
      });
    });

    describe('a physics map with multiple source key', function () {
      beforeEach(function () {
        const physicsMap = ['*', {
          'key': ['source.state', 'different.state']
        }];

        const bridge = makeTestible('core/client/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnClientReady(defer('game'))();
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['client', 'key', 'source.state', {
          position: {x: 4, y: 5}
        }]);
        expect(physicsSystem.register.secondCall.args).toEqual(['client', 'key', 'different.state', {
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
        const physicsMap = ['*', {
          'keyA': ['source.state'],
          'keyB': ['different.state']
        }];

        const bridge = makeTestible('core/client/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnClientReady(defer('game'))();
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['client', 'keyA', 'source.state', {
          position: {x: 4, y: 5}
        }]);
        expect(physicsSystem.register.secondCall.args).toEqual(['client', 'keyB', 'different.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(physicsSystem.updated.firstCall.args).toEqual(['client', 'source.state', undefined]);
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
        expect(physicsSystem.updated.secondCall.args).toEqual(['client', 'different.state', undefined]);
        expect(onChangeOf.secondCall.args).toEqual(['different.state', updatedCallback]);
      });
    });

    describe('a physics map with static objects', function () {
      function positionOnly (thing) {
        return thing.position;
      }

      beforeEach(function () {
        const physicsMap = ['*', {
          'keyA': [{ position: { x: -100, y: -100}, width: 700, height: 100}],
          'keyB': [{ position: { x: -100, y: -100}, width: 700, height: 100, via: positionOnly}]
        }];

        const bridge = makeTestible('core/client/physics-system-bridge', {
          PhysicsMap: [physicsMap],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnClientReady(defer('game'))();
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['client', 'keyA', 'static1', { position: { x: -100, y: -100}, width: 700, height: 100}
        ]);
        expect(physicsSystem.register.secondCall.args).toEqual(['client', 'keyB', 'static1', { x: -100, y: -100 }
        ]);
      });

      it('should NOT setup a trigger binding', function () {
        expect(physicsSystem.updated.called).toEqual(false);
        expect(onChangeOf.called).toEqual(false);
      });
    });

    describe('dealing with modes', function () {
      beforeEach(function () {
        const map1 = ['*', {'key1': ['source.state'] }];
        const map2 = ['arcade', {'key2': ['source.state'] }];
        const map3 = ['endless', {'key3': ['source.state'] }];

        const bridge = makeTestible('core/client/physics-system-bridge', {
          PhysicsMap: [map1, map2, map3],
          StateTracker: tracker,
          PhysicsSystem: physicsSystem,
          StateAccess: stateAccess
        });

        physicsSystem.register.reset();
        physicsSystem.updated.reset();
        onChangeOf.reset();

        bridge[1].OnClientReady(defer('arcade'))();
      });

      it('should pass the source state to the physics system', function () {
        expect(physicsSystem.register.firstCall.args).toEqual(['client', 'key1', 'source.state', {
          position: {x: 4, y: 5}
        }]);
        expect(physicsSystem.register.secondCall.args).toEqual(['client', 'key2', 'source.state', {
          position: {x: 4, y: 5}
        }]);
      });

      it('should setup a trigger binding to wire the source changes with the physics system', function () {
        expect(physicsSystem.updated.firstCall.args).toEqual(['client', 'source.state', undefined]);
        expect(physicsSystem.updated.secondCall.args).toEqual(['client', 'source.state', undefined]);
        expect(onChangeOf.firstCall.args).toEqual(['source.state', updatedCallback]);
      });
    });
  });

  describe('on physics frame', function () {
    let bridge;

    beforeEach(function () {
      const physicsMap = ['*', {
        'key': ['source.state'],
        'composite': ['source.state', 'second.state'],
        'static': [{ position: { x: -100, y: -100}, width: 700, height: 100}]
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
      bridge[1].OnPhysicsFrame()(0.15, scopedState);

      expect(physicsSystem.tick.firstCall.args).toEqual([0.15]);
    });

    describe('when nothing is returned', function () {
      it('should return nothing', function () {
        expect(bridge[1].OnPhysicsFrame()(0.15, scopedState)).toEqual(undefined);
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
          expect(bridge[1].OnPhysicsFrame()(0.15, scopedState)).toEqual({
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
          expect(bridge[1].OnPhysicsFrame()(0.15, scopedState)).toEqual({
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