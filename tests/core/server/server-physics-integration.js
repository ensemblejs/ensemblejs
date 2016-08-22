'use strict';

const expect = require('expect');
const sinon = require('sinon');
const { defer } = require('../../support');
const mutatorPlugins = require('../../support').plugin();
const trackerPlugins = require('../../support').plugin();
const module = '../../../src/state/server/tracker';

require('../../../src/state/server/mutator').func(defer(mutatorPlugins.define));
const mutatorDeps = mutatorPlugins.deps();
let mutateNow = mutatorDeps.SyncMutator();
let applyPendingMerges = mutatorDeps.ApplyPendingMerges();
let rawStateAccess = mutatorDeps.RawStateAccess();

function applyMutation (saveStates) {
  saveStates.forEach(saveState => {
    mutateNow(saveState[0], saveState[1]);
  });
}

let tracker;

describe('ServerPhysics-StateTracker Integration', function () {
  let callback = sinon.spy();
  let callback2 = sinon.spy();
  let afterPhysicsFrame;
  let deps;

  beforeEach(function () {
    callback.reset();
    callback2.reset();
    tracker = require(module).func(defer(trackerPlugins.define), defer(rawStateAccess));

    deps = trackerPlugins.deps();
    afterPhysicsFrame = deps.AfterPhysicsFrame();

    tracker = tracker.for(1);
  });

  describe('working with properties', function () {
    describe('when a property changes', function() {
      beforeEach(function () {
        applyMutation(
          [
            [1, {property: 'unchanged', a: { b: 'c'}, arr:[{id:1, value: 7}]}]
          ]
        );
        afterPhysicsFrame();
        tracker.onChangeOf('property', callback, 'data');

        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();

        expect(callback.callCount).toBe(1);
      });

      it('should not invoke the callback when the thing does not change', function () {
        applyMutation([[1, {property: 'unchanged'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual(['changed', 'unchanged', 'data']);
      });

      it('should work with dot strings', function () {
        tracker.onChangeOf('property', callback, 'data');
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);

        callback.reset();

        tracker.onChangeOf('a.b', callback);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);
        expect(callback.firstCall.args).toEqual(['c', 'c', undefined]);
      });

      it('should work with dot strings enhancements', function () {
        tracker.onChangeOf('property', callback, 'data');
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);

        callback.reset();

        tracker.onChangeOf('arr:1.value', callback);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);
        expect(callback.firstCall.args).toEqual([7, 7, undefined]);
      });
    });

    describe('when there is no prior state', function() {
      beforeEach(function () {
        tracker.onChangeOf('property', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass only the new values of the thing and the data to the callback', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual(['changed', undefined, 'data']);
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        applyMutation([[1, {property: 'unchanged', a: {b: 'c'}}]]);
        afterPhysicsFrame();
        tracker.onChangeTo('property', 'changed', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the correct state', function () {
        applyMutation([[1, {property: 'other'}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        applyMutation([[1, {property: 'changed'}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual(['changed', 'unchanged', 'data']);
      });

      it('should call the callback immediately if the state is already true', function() {
        callback.reset();
        tracker.onChangeTo('property', 'unchanged', callback, 'data');
        expect(callback.calledOnce).toBe(true);
      });

      it('should work with dot strings', function () {
        callback.reset();
        tracker.onChangeTo('property', 'something-else', callback);
        applyMutation([[1, {property: 'something-else', a: {b: 'c'}}]]);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);

        callback.reset();
        tracker.onChangeTo('a.b', 'd', callback);
        applyMutation([[1, {a: {b: 'd'}}]]);
        afterPhysicsFrame();
        expect(callback.callCount).toBe(1);
      });

      describe('when using literals', function () {
        beforeEach(function () {
          callback.reset();
        });

        it('should support strings', function () {
          tracker.onChangeTo('property', 'something-else', callback, 'data');
          applyMutation([[1, {property: 'something-else'}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });

        it('should support numbers', function () {
          tracker.onChangeTo('property', 7, callback, 'data');
          applyMutation([[1, {property: 7}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });

        it('should support booleans', function () {
          tracker.onChangeTo('property', false, callback, 'data');
          applyMutation([[1, {property: false}]]);
          afterPhysicsFrame();

          expect(callback.callCount).toBe(1);
        });
      });
    });
  });

  describe('working with objects', function () {
    describe('when the object changes', function() {
      beforeEach(function () {
        applyMutation([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        applyPendingMerges();

        tracker.onChangeOf('obj', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change', function () {
        applyMutation([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, { child: 'value'}, 'data']);
      });
    });

    describe('when there is no prior state', function() {
      beforeEach(function () {
        tracker.onChangeOf('obj', callback, 'data');
        callback.reset();
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should pass the new values of the thing and the data to the callback', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, undefined, 'data']);
      });
    });

    describe('when detecting a change to a particular value', function() {
      beforeEach(function () {
        applyMutation([[1, {obj: {child: 'value'}}]]);
        afterPhysicsFrame();
        tracker.onChangeTo('obj', {child: 'newValue'}, callback, 'data');
      });

      it('should invoke the callback when the change occurs', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(true);
      });

      it('should not invoke the callback when the thing does not change to the desired state', function () {
        applyMutation([[1, {obj: {child: 'otherValue'}}]]);
        afterPhysicsFrame();
        expect(callback.calledOnce).toBe(false);
      });

      it('should pass the old and new values of the thing and the data to the callback', function() {
        applyMutation([[1, {obj: {child: 'newValue'}}]]);
        afterPhysicsFrame();
        expect(callback.firstCall.args).toEqual([{ child: 'newValue'}, { child: 'value'}, 'data']);
      });

      it('should call the callback immediately if the state is already true', function() {
        callback.reset();
        tracker.onChangeTo('obj', {child: 'value'}, callback, 'data');
        expect(callback.calledOnce).toBe(true);
      });
    });
  });

  describe('working with arrays', function () {
    describe('when an element is added', function() {
      beforeEach(function() {
        applyMutation([[1, { numbers: [] }]]);
        afterPhysicsFrame();
        tracker.onElementAdded('numbers', callback, 'data');
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the new element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
      });

      it('should invoked the callback with each existing elements in the array', function() {
        callback.reset();
        trackerPlugins.reset();
        tracker = require(module).func(defer(trackerPlugins.define), defer(rawStateAccess));
        tracker = tracker.for(1);

        deps = trackerPlugins.deps();
        afterPhysicsFrame = deps.AfterPhysicsFrame();

        applyMutation([
          [1, { numbers: [{id: 1, value: '7'}, {id: 2, value: '17'}] }]
        ]);
        afterPhysicsFrame();
        tracker.onElementAdded('numbers', callback, 'data');
        expect(callback.callCount).toBe(2);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
        expect(callback.secondCall.args).toEqual([2, {id: 2, value: '17'}, 'data']);
      });

      it('should work with dot strings', function () {
        callback.reset();
        tracker.onElementAdded('numbers', callback);
        expect(callback.callCount).toBe(1);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, undefined]);
      });
    });

    describe('when an element is removed', function() {
      beforeEach(function() {
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
        tracker.onElementRemoved('numbers', callback, 'data');
        applyMutation([[1, { numbers: [] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, 'data']);
      });

      it('should work with dot strings', function () {
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();

        callback2.reset();
        tracker.onElementRemoved('numbers', callback2);
        applyMutation([[1, { numbers: [] }]]);
        afterPhysicsFrame();

        expect(callback2.callCount).toBe(1);
        expect(callback2.firstCall.args).toEqual([1, {id: 1, value: '7'}, undefined]);
      });
    });

    describe('when an element is changed', function() {
      beforeEach(function() {
        applyMutation([[1, { numbers: [{id: 1, value: '6'}] }]]);
        afterPhysicsFrame();
        tracker.onElementChanged('numbers', callback, 'data');
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
      });

      it('should invoke the callback with the removed element and the data', function() {
        expect(callback.calledOnce).toBe(true);
        expect(callback.firstCall.args).toEqual([1, {id: 1, value: '7'}, {id: 1, value: '6'}, 'data']);
      });

      it('should not invoke the callback when nothing has changed', function() {
        callback.reset();
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();
        expect(callback.called).toEqual(false);
      });

      it('should work with dot strings', function () {
        callback2.reset();

        applyMutation([[1, { numbers: [{id: 1, value: '6'}] }]]);
        afterPhysicsFrame();
        tracker.onElementChanged('numbers', callback2);
        applyMutation([[1, { numbers: [{id: 1, value: '7'}] }]]);
        afterPhysicsFrame();

        expect(callback2.callCount).toBe(1);
        expect(callback2.firstCall.args).toEqual([1, {id: 1, value: '7'}, {id: 1, value: '6'}, undefined]);
      });
    });
  });

  describe('handling multiple games', function () {
    let game1Callback = sinon.spy();
    let game2Callback = sinon.spy();
    let t1;
    let t2;

    beforeEach(function () {
      tracker = require(module).func(defer(trackerPlugins.define), defer(rawStateAccess));
      deps = trackerPlugins.deps();
      afterPhysicsFrame = deps.AfterPhysicsFrame();
      t1 = tracker.for(1);
      t2 = tracker.for(2);

      applyMutation([
        [1, { property: 'unchanged' }],
        [2, { property: 'unchanged' }]
      ]);
      afterPhysicsFrame();

      t1.onChangeOf('property', game1Callback);
      t2.onChangeOf('property', game2Callback);

      game1Callback.reset();
      game2Callback.reset();
    });

    it('should ignore state changes in other games', function () {
      applyMutation([
        [1, { property: 'unchanged' }],
        [2, { property: 'changed' }]
      ]);
      afterPhysicsFrame();

      expect(game1Callback.calledOnce).toBe(false);
      expect(game2Callback.calledOnce).toBe(true);

      game1Callback.reset();
      game2Callback.reset();

      applyMutation([
        [1, { property: 'changed' }],
        [2, { property: 'changed' }]
      ]);
      afterPhysicsFrame();

      expect(game1Callback.calledOnce).toBe(true);
      expect(game2Callback.calledOnce).toBe(false);
    });
  });
});














// 'use strict';

// var expect = require('expect');
// var sinon = require('sinon');
// var each = require('lodash').each;

// var logger = require('../../fake/logger');
// import define from '../../../src/plugins/plug-n-play';
// import {configure, plugin} from '../../../src/plugins/plug-n-play';
// configure(logger);

// let sequence = require('distributedlife-sequence');

// var config = {
//   server: {
//     physicsUpdateLoop: 15
//   }
// };
// define('Config', function Config() {
//   return config;
// });

// var fakeTime = require('../../fake/time').at(2000);
// define('Time', function Time () {
//   return fakeTime;
// });

// var defer = require('../../support').defer;
// var trackerPlugins = require('../../support').plugin();
// var processPendingInputPlugins = require('../../support').plugin();
// var physicsPlugins = require('../../support').plugin();

// var onServerReady = [];
// var onOutgoingClientPacket = [];
// var onIncomingServerPacket = [];
// var beforePhysicsFrame = [];
// var onPhysicsFrame = [];
// var afterPhysicsFrame = [];
// var actionMap = [];
// var onInput, onConnect, onDisconnect, onError, onPause, onResume, onServerStart, onClientReady, onServerStop, onOutgoingServerPacket, onClientConnect, onClientDisconnect, onNewGame, onClientStart = [];
// var dimensions = {};

// require('../../../src/state/server/tracker').func(defer(trackerPlugins.define));
// var mutator = require('../../../src/state/server/mutator').func(defer(define));
// var rawStateAccess = plugin('RawStateAccess');
// var stateAccess = plugin('StateAccess');

// require('../../../src/input/server/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator));
// var processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame();

// var on = require('../../../src/events/shared/on').func(defer(mutator), defer(stateAccess), defer(onInput), defer(onConnect), defer(onDisconnect), defer(onIncomingServerPacket), defer(onClientStart), defer(onError), defer(onOutgoingClientPacket), defer(onPause), defer(onResume), defer(onServerStart), defer(onServerReady), defer(onClientReady), defer(onServerStop), defer(onOutgoingServerPacket), defer(onClientConnect), defer(onClientDisconnect), defer(onNewGame), defer(dimensions));

// var trackerPluginsDeps = trackerPlugins.deps();
// onServerReady.push(trackerPluginsDeps.onServerReady(defer(rawStateAccess)));
// beforePhysicsFrame.push(processPendingInput);
// afterPhysicsFrame.push(trackerPluginsDeps.AfterPhysicsFrame(defer(rawStateAccess)));

// var savesList = {
//   loaded: sinon.spy()
// };

// var startPhysicsEngine = require('../../../src/core/server/physics').func(
//   defer(beforePhysicsFrame), defer(onPhysicsFrame), defer(afterPhysicsFrame),
//   defer(stateAccess), defer(mutator), defer(savesList), defer(physicsPlugins.define), defer(fakeTime));
// var stopPhysicsEngine = plugin('OnDisconnect');

// function tracking (state) { return state.namespace.tracking; }
// function count (state) { return state.namespace.count; }

// function inputCallback (state) {
//   return {
//     namespace: {
//       count: state.namespace.count + 10,
//       tracking: 'after-input'
//     }
//   };
// }
// actionMap.push(['*', { space: [{call: inputCallback} ] }]);

// function gameLogic (delta, state) {
//   return {
//     namespace: {
//       count: state.namespace.count + 1,
//       tracking: 'after-game-logic'
//     }
//   };
// }

// describe.only('Server phyiscs loop integration', () => {
//   let next;

//   beforeEach(() => {
//     next = sinon.stub(sequence, 'next');
//     for (let i = 0; i < 5; i++) {
//       next.onCall(i).returns(i + 1);
//     }

//     var initialState = {
//       ensemble: { waitingForPlayers: false },
//       namespace: {
//         count: 0,
//         tracking: 'initial-server-state'
//       }
//     };

//     each(onServerReady, function (callback) {
//       callback(initialState);
//     });
//   });

//   afterEach(() => {
//     next.restore();
//   });

//   describe('when game logic exists ', () => {
//     beforeEach(() => {
//       onPhysicsFrame.push(['*', gameLogic]);
//       startPhysicsEngine();
//     });

//     afterEach(() => {
//       stopPhysicsEngine();
//       onPhysicsFrame.pop();
//     });

//     it('should apply the changes of the game logic to the prior state', () => {
//       expect(rawStateAccess.for(1).get(tracking)).toEqual('after-game-logic');
//       expect(rawStateAccess.for(1).get(count)).toEqual(1);
//     });

//     describe('when waitingForPlayers', () => {
//       beforeEach(() => {
//         var initialState = {
//           ensemble: { waitingForPlayers: false },
//           namespace: {
//             count: 0,
//             tracking: 'initial-server-state'
//           }
//         };

//         each(onServerReady, function (callback) {
//           callback(initialState);
//         });
//       });

//       it('should not run the save', () => {
//         expect(rawStateAccess.for(1).get(tracking)).toEqual('initial-server-state');
//         expect(rawStateAccess.for(1).get(count)).toEqual(0);
//       });
//     });
//   });

//   describe('when user input exists', () => {
//     beforeEach(() => {
//       on.outgoingClientPacket({
//         id: 1,
//         keys: [{key: 'space'}]
//       });

//       startPhysicsEngine();
//     });

//     afterEach(() => {
//       stopPhysicsEngine();
//     });

//     it('should process input on top of last known server state', () => {
//       expect(currentState.get(tracking)).toEqual('after-input');
//       expect(currentState.get(count)).toEqual(10);
//     });

//     it('when run twice it should result in same server state', () => {
//       startPhysicsEngine();

//       expect(currentState.get(tracking)).toEqual('after-input');
//       expect(currentState.get(count)).toEqual(10);

//       stopPhysicsEngine();
//     });
//   });
// });