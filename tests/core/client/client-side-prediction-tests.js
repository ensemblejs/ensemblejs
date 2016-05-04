'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;

var logger = require('../../fake/logger');
import define from '../../../src/plugins/plug-n-play';
import {configure, plugin} from '../../../src/plugins/plug-n-play';
configure(logger);

var config = {
  client: {
    clientSidePrediction: true,
    physicsUpdateLoop: 15
  }
};
define('Config', function Config() {
  return config;
});

var fakeTime = require('../../fake/time').at(2000);
define('Time', function Time () {
  return fakeTime;
});

var defer = require('../../support').defer;
var trackerPlugins = require('../../support').plugin();
var processPendingInputPlugins = require('../../support').plugin();
var inputQueuePlugins = require('../../support').plugin();
var frameStorePlugins = require('../../support').plugin();

var profiler = {
  timer: function () {
    return {
      track: function(f) {
        f();
      }
    };
  }
};

var onClientStart = [];
var onOutgoingClientPacket = [];
var onIncomingServerPacket = [];
var beforePhysicsFrame = [];
var onPhysicsFrame = [];
var afterPhysicsFrame = [];
var actionMap = [];
var onInput, onConnect, onDisconnect, onError, onPause, onResume, onServerStart, onServerReady, onClientReady, onServerStop, onOutgoingServerPacket, onClientConnect, onClientDisconnect, onNewGame = [];
var dimensions = {};

var tracker = require('../../../src/state/client/tracker').func(defer(trackerPlugins.define));
var mutator = require('../../../src/state/client/mutator').func(defer(logger));
// afterPhysicsFrame.push(plugin('AfterPhysicsFrame'));
var rawStateAccess = plugin('RawStateAccess');
var stateAccess = plugin('StateAccess');

var mode = 'default';
var inputQueue = require('../../../src/input/client/queue').func(defer(inputQueuePlugins.define), defer(mode), defer(fakeTime), defer(plugin('Config')));

require('../../../src/input/client/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
var processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame(defer(inputQueue));

var on = require('../../../src/events/shared/on').func(defer(mutator), defer(stateAccess), defer(onInput), defer(onConnect), defer(onDisconnect), defer(onIncomingServerPacket), defer(onClientStart), defer(onError), defer(onOutgoingClientPacket), defer(onPause), defer(onResume), defer(onServerStart), defer(onServerReady), defer(onClientReady), defer(onServerStop), defer(onOutgoingServerPacket), defer(onClientConnect), defer(onClientDisconnect), defer(onNewGame), defer(dimensions));

var resetTo = sinon.spy(rawStateAccess, 'resetTo');
var trackerPluginsDeps = trackerPlugins.deps();
var currentState = trackerPluginsDeps.CurrentState();
var currentServerState = trackerPluginsDeps.CurrentServerState();
onClientStart.push(trackerPluginsDeps.OnClientStart(defer(rawStateAccess)));
// var inputQueuePluginsDeps = inputQueuePlugins.deps();
// onOutgoingClientPacket.push(inputQueuePluginsDeps.OnOutgoingClientPacket());
onIncomingServerPacket.push(trackerPluginsDeps.OnIncomingServerPacket(defer(rawStateAccess)));
// onIncomingServerPacket.push(inputQueuePluginsDeps.OnIncomingServerPacket());
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerPluginsDeps.AfterPhysicsFrame(defer(rawStateAccess)));
// afterPhysicsFrame.push(inputQueuePluginsDeps.AfterPhysicsFrame());

var clientState = {
  get: function () {return false;}
};

var serverState = {
  get: function () {return false;}
};

var startPhysicsEngine = require('../../../src/core/client/physics').func(defer(clientState), defer(serverState), defer(fakeTime), defer(beforePhysicsFrame), defer(onPhysicsFrame), defer(afterPhysicsFrame), defer(mutator), defer(stateAccess), defer(mode), defer(plugin('Config')), defer(profiler));
var stopPhysicsEngine = plugin('OnDisconnect');


var frameStore = require('../../../src/core/client/frame-store').func(defer(rawStateAccess), defer(inputQueue), defer(frameStorePlugins.define), defer(fakeTime));
var frameStorePluginDeps = frameStorePlugins.deps();
onIncomingServerPacket.push(frameStorePluginDeps.OnIncomingServerPacket());
onOutgoingClientPacket.push(frameStorePluginDeps.OnOutgoingClientPacket());

function tracking (state) { return state.namespace.tracking; }
function count (state) { return state.namespace.count; }

function inputCallback (state) {
  return {
    namespace: {
      count: state.for('namespace').get('count') + 10,
      tracking: 'after-input'
    }
  };
}
actionMap.push(['*', { space: [{call: inputCallback} ] }]);

function gameLogic (delta, state) {
  return {
    namespace: {
      count: state.for('namespace').get('count') + 1,
      tracking: 'after-game-logic'
    }
  };
}

describe('CSP: after on AfterPhysicsFrame', function () {
  beforeEach(function () {
    var initialState = {
      ensemble: { waitingForPlayers: false },
      namespace: {
        count: 0,
        tracking: 'initial-server-state'
      }
    };

    each(onClientStart, function (callback) {
      callback(initialState);
    });
  });

  describe('when no input or logic', function () {
    beforeEach(function () {
      startPhysicsEngine();
    });

    afterEach(function () {
      stopPhysicsEngine();
    });

    it('should use the last server state as the client state', function () {
      expect(currentState.get(tracking)).toEqual('initial-server-state');
    });

    it('should reset the RawState back to last known server state', function () {
      expect(resetTo.firstCall.args).toEqual([{
        ensemble: { waitingForPlayers: false },
        namespace: {
          count: 0,
          tracking: 'initial-server-state'
        }
      }]);
    });
  });

  describe('when game logic exists ', function () {
    beforeEach(function () {
      onPhysicsFrame.push(['*', gameLogic]);
      startPhysicsEngine();
    });

    afterEach(function () {
      stopPhysicsEngine();
      onPhysicsFrame.pop();
    });

    it('should apply the changes of the game logic to the last known server state', function () {
      expect(currentState.get(tracking)).toEqual('after-game-logic');
      expect(currentState.get(count)).toEqual(1);
    });

    it('when run twice it should result in the same client state', function () {
      startPhysicsEngine();
      expect(currentState.get(tracking)).toEqual('after-game-logic');
      expect(currentState.get(count)).toEqual(1);

      stopPhysicsEngine();
    });

    describe('when waitingForPlayers', function () {
      beforeEach(function () {
        var initialState = {
          ensemble: { waitingForPlayers: false },
          namespace: {
            count: 0,
            tracking: 'initial-server-state'
          }
        };

        each(onClientStart, function (callback) {
          callback(initialState);
        });
      });

      it('should not run the save', function () {
        expect(currentState.get(tracking)).toEqual('initial-server-state');
        expect(currentState.get(count)).toEqual(0);
      });
    });
  });

  describe('when user input exists', function () {
    beforeEach(function () {
      on.outgoingClientPacket({
        id: 1,
        keys: [{key: 'space'}]
      });

      startPhysicsEngine();
    });

    afterEach(function () {
      stopPhysicsEngine();
    });

    it('should process input on top of last known server state', function () {
      expect(currentState.get(tracking)).toEqual('after-input');
      expect(currentState.get(count)).toEqual(10);
    });

    it('when run twice it should result in same client state', function () {
      startPhysicsEngine();

      expect(currentState.get(tracking)).toEqual('after-input');
      expect(currentState.get(count)).toEqual(10);

      stopPhysicsEngine();
    });
  });

  describe('when new server state comes', function () {
    var laterState = {
      highestProcessedMessage: 1,
      saveState: {
        ensemble: { waitingForPlayers: false },
        namespace: {
          count: 20,
          tracking: 'after-new-packet'
        }
      }
    };

    beforeEach(function () {
      on.incomingServerPacket(laterState);

      startPhysicsEngine();
    });

    afterEach(function () {
      stopPhysicsEngine();
    });

    it('should defer new server states until the end of the next physics frame', function () {
      expect(currentState.get(tracking)).toNotEqual('after-new-packet');
    });

    it('should remove input now processed by the server', function () {
      on.outgoingClientPacket({
        id: 2,
        keys: [{key: 'space'}]
      });

      startPhysicsEngine();

      expect(currentState.get(tracking)).toEqual('after-input');
      expect(currentState.get(count)).toEqual(30);
    });
  });

  describe('when disabled', function () {
    var logic = sinon.spy();

    beforeEach(function () {
      config.client.clientSidePrediction = true;
      each(onIncomingServerPacket, code => code({id: 200}));
      each(afterPhysicsFrame, code => code());
      expect(inputQueue.length()).toEqual(0);

      logic.reset();
      config.client.clientSidePrediction = false;

      onPhysicsFrame.push(['*', logic]);
      startPhysicsEngine();

      on.outgoingClientPacket({
        id: 1,
        keys: [{key: 'space'}]
      });

      expect(inputQueue.length()).toEqual(0);
    });

    afterEach(() => {
      config.client.clientSidePrediction = true;
    });

    afterEach(function () {
      stopPhysicsEngine();
      onPhysicsFrame.pop();
    });

    it('should not call onPhysicsFrame', function () {
      expect(logic.called).toEqual(false);
    });

    it('should not increase the input queue', function () {
      expect(inputQueue.length()).toEqual(0);
    });
  });
});

describe.only('curly scenarios', function () {
  var curlyChanges = sinon.spy();
  var initialState = {
    ensemble: { waitingForPlayers: false },
    curly: { count: 0 }
  };
  function curlyCount (state) { return state.curly.count; }
  function curlyInputCallback (state) {
    console.log('input');
    return { curly: { count: state.for('curly').get('count') + 1 }};
    // return { curly: { count: state.curly.count + 1 } };
  }
  function curlyLogic (delta, state) {
    console.log('logic');
    return { curly: { count: state.for('curly').get('count') + 1000 }};
    // return { curly: { count: state.curly.count + 1000 }};
  }

  var onEachFrameSpy = sinon.spy();

  before(() => {
    stopPhysicsEngine();

    each(onClientStart, callback => callback(initialState));

    actionMap.push(['*', { curly: [{call: curlyInputCallback} ] }]);
    onPhysicsFrame.push(curlyLogic);
    onPhysicsFrame.push(onEachFrameSpy);

    tracker.onChangeOf('curly.count', curlyChanges);
  });

  beforeEach(function () {
    // each(onClientStart, callback => callback(initialState));

    // on.incomingServerPacket(laterState);

    // on.outgoingClientPacket({ id: 506, keys: [{key: 'curly'}] });
    // on.outgoingClientPacket({ id: 507, keys: [{key: 'curly'}] });

    onEachFrameSpy.reset();
    curlyChanges.reset();
  });

  it('should have a known base line', () => {
    expect(currentState.get(curlyCount)).toEqual(0);
    expect(currentServerState.get(curlyCount)).toEqual(0);
    expect(rawStateAccess.get('client').curly.count).toEqual(0);
    expect(inputQueue.length()).toEqual(0);
  });

  function processFrame (frame) {
    each(beforePhysicsFrame, f => {
      mutator('client', f(frame.delta, stateAccess.for('client')));
    });
    each(onPhysicsFrame, f => {
      mutator('client', f(frame.delta, stateAccess.for('client')));
    });
  }

  describe('no input scenarios, no new server state', () => {
    beforeEach(() => {
      frameStore.process(0.10, processFrame);

      each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));
    });

    it('should process one frame', () => {
      expect(currentState.get(curlyCount)).toEqual(1000);
      expect(currentServerState.get(curlyCount)).toEqual(0);
      expect(rawStateAccess.get('client').curly.count).toEqual(1000);

      expect(onEachFrameSpy.callCount).toEqual(1);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([1000, 0, undefined]);

      expect(frameStore.current().id).toEqual(1);
    });

    it('should should remember prior frame, process new frame', () => {
      expect(currentState.get(curlyCount)).toEqual(2000);
      expect(currentServerState.get(curlyCount)).toEqual(0);
      expect(rawStateAccess.get('client').curly.count).toEqual(2000);

      expect(onEachFrameSpy.callCount).toEqual(1);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([2000, 1000, undefined]);

      expect(frameStore.current().id).toEqual(2);
    });

    it('should should remember 2 prior frame, process new frame', () => {
      expect(currentState.get(curlyCount)).toEqual(3000);
      expect(currentServerState.get(curlyCount)).toEqual(0);
      expect(rawStateAccess.get('client').curly.count).toEqual(3000);

      expect(onEachFrameSpy.callCount).toEqual(1);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([3000, 2000, undefined]);

      expect(frameStore.current().id).toEqual(3);
    });
  });

  describe('with input', () => {
    before(() => {
      on.outgoingClientPacket({ id: 506, keys: [{key: 'curly'}] });
    });

    beforeEach(() => {
      frameStore.process(0.15, processFrame);

      each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));
    });

    it('should process one frame', () => {
      expect(currentState.get(curlyCount)).toEqual(4001);
      expect(currentServerState.get(curlyCount)).toEqual(0);
      expect(rawStateAccess.get('client').curly.count).toEqual(4001);

      expect(onEachFrameSpy.callCount).toEqual(1);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([4001, 3000, undefined]);

      expect(frameStore.current().id).toEqual(4);
    });

    it('should not process the input twice', () => {
      expect(currentState.get(curlyCount)).toEqual(5001);
      expect(currentServerState.get(curlyCount)).toEqual(0);
      expect(rawStateAccess.get('client').curly.count).toEqual(5001);

      expect(onEachFrameSpy.callCount).toEqual(1);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([5001, 4001, undefined]);

      expect(frameStore.current().id).toEqual(5);
    });
  });

  describe('with new server state', () => {
    var laterState = {
      highestProcessedMessage: 4,
      saveState: {
        ensemble: { waitingForPlayers: false },
        curly: { count: 100 }
      }
    };

    before(() => {
      on.incomingServerPacket(laterState);
    });

    beforeEach(() => {
      frameStore.process(0.15, processFrame);

      each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));
    });

    it('should discard processed frames', () => {
      expect(currentState.get(curlyCount)).toEqual(2100);
      expect(currentServerState.get(curlyCount)).toEqual(100);
      expect(rawStateAccess.get('client').curly.count).toEqual(2100);

      expect(onEachFrameSpy.callCount).toEqual(2);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([2100, 5001, undefined]);

      expect(frameStore.current().id).toEqual(6);
    });

    it('should not reprocess frames');
    it('should process new frames');
  });

  it.skip('when server state comes in before beforePhysicsFrame', () => {
    // first frame

    var laterState = {
      highestProcessedMessage: 506,
      saveState: {
        ensemble: { waitingForPlayers: false },
        curly: { count: 101 }
      }
    };

    on.incomingServerPacket(laterState);

    each(beforePhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(100);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    each(onPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(100);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(101);
    expect(inputQueue.length()).toEqual(1);

    expect(curlyChanges.callCount).toEqual(1);
    expect(curlyChanges.firstCall.args).toEqual([102, 100, undefined]);

    // second frame
    curlyChanges.reset();

    each(beforePhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(1);

    each(onPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(1);

    each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(101);
    expect(inputQueue.length()).toEqual(1);

    expect(curlyChanges.called).toEqual(false);
  });

  it.skip('when server state comes in before onPhysicsFrame', () => {

    // first frame

    each(beforePhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(100);
    expect(currentServerState.get(curlyCount)).toEqual(100);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    var laterState = {
      highestProcessedMessage: 506,
      saveState: {
        ensemble: { waitingForPlayers: false },
        curly: { count: 101 }
      }
    };

    on.incomingServerPacket(laterState);

    each(onPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(100);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(101);
    expect(inputQueue.length()).toEqual(1);
    expect(curlyChanges.callCount).toEqual(1);
    expect(curlyChanges.firstCall.args).toEqual([102, 100, undefined]);

    // second frame
    curlyChanges.reset();

    each(beforePhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(1);

    each(onPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(1);

    each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(101);
    expect(inputQueue.length()).toEqual(1);

    expect(curlyChanges.called).toEqual(false);
  });

  it.skip('when server state comes in before afterPhysicsFrame', () => {

    // first frame

    each(beforePhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(100);
    expect(currentServerState.get(curlyCount)).toEqual(100);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    each(onPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(100);
    expect(currentServerState.get(curlyCount)).toEqual(100);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    var laterState = {
      highestProcessedMessage: 506,
      saveState: {
        ensemble: { waitingForPlayers: false },
        curly: { count: 101 }
      }
    };

    on.incomingServerPacket(laterState);

    each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(101);
    expect(inputQueue.length()).toEqual(1);
    expect(curlyChanges.callCount).toEqual(1);
    expect(curlyChanges.firstCall.args).toEqual([102, 100, undefined]);

    // second frame
    curlyChanges.reset();

    each(beforePhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(1);

    each(onPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(1);

    each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(101);
    expect(inputQueue.length()).toEqual(1);

    expect(curlyChanges.called).toEqual(false);
  });

  it.skip('when server state comes in after afterPhysicsFrame', () => {

    // first frame

    each(beforePhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(100);
    expect(currentServerState.get(curlyCount)).toEqual(100);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    each(onPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(100);
    expect(currentServerState.get(curlyCount)).toEqual(100);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(100);
    expect(rawStateAccess.get('client').curly.count).toEqual(100);
    expect(inputQueue.length()).toEqual(2);
    expect(curlyChanges.callCount).toEqual(1);
    expect(curlyChanges.firstCall.args).toEqual([102, 100, undefined]);

    // end first frame

    var laterState = {
      highestProcessedMessage: 506,
      saveState: {
        ensemble: { waitingForPlayers: false },
        curly: { count: 101 }
      }
    };

    on.incomingServerPacket(laterState);

    // second frame
    curlyChanges.reset();

    each(beforePhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    each(onPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(102);
    expect(inputQueue.length()).toEqual(2);

    each(afterPhysicsFrame, f => f(0.1, stateAccess.for('client')));

    expect(currentState.get(curlyCount)).toEqual(102);
    expect(currentServerState.get(curlyCount)).toEqual(101);
    expect(rawStateAccess.get('client').curly.count).toEqual(101);
    expect(inputQueue.length()).toEqual(1);

    expect(curlyChanges.called).toEqual(false);
  });
});