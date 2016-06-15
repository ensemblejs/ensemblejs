'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;

var logger = require('../../fake/logger');
import define from '../../../src/plugins/plug-n-play';
import {configure, plugin} from '../../../src/plugins/plug-n-play';
configure(logger);

let sequence = require('distributedlife-sequence');

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
var rawStateAccess = plugin('RawStateAccess');
var stateAccess = plugin('StateAccess');

var mode = 'default';
var inputQueue = require('../../../src/input/client/queue').func(defer(inputQueuePlugins.define), defer(mode), defer(fakeTime), defer(plugin('Config')));

require('../../../src/input/client/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
var processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame(defer(inputQueue));

var on = require('../../../src/events/shared/on').func(defer(mutator), defer(stateAccess), defer(onInput), defer(onConnect), defer(onDisconnect), defer(onIncomingServerPacket), defer(onClientStart), defer(onError), defer(onOutgoingClientPacket), defer(onPause), defer(onResume), defer(onServerStart), defer(onServerReady), defer(onClientReady), defer(onServerStop), defer(onOutgoingServerPacket), defer(onClientConnect), defer(onClientDisconnect), defer(onNewGame), defer(dimensions));

var trackerPluginsDeps = trackerPlugins.deps();
var currentState = trackerPluginsDeps.CurrentState();
var currentServerState = trackerPluginsDeps.CurrentServerState();
onClientStart.push(trackerPluginsDeps.OnClientStart(defer(rawStateAccess)));
onIncomingServerPacket.push(trackerPluginsDeps.OnIncomingServerPacket(defer(rawStateAccess)));
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerPluginsDeps.AfterPhysicsFrame(defer(rawStateAccess)));

var frameStore = require('../../../src/core/client/frame-store').func(defer(rawStateAccess), defer(inputQueue), defer(frameStorePlugins.define), defer(fakeTime), defer('default'));
var frameStorePluginDeps = frameStorePlugins.deps();
onIncomingServerPacket.push(frameStorePluginDeps.OnIncomingServerPacket());
onOutgoingClientPacket.push(frameStorePluginDeps.OnOutgoingClientPacket());
onClientStart.push(frameStorePluginDeps.OnClientStart());

describe('curly scenarios', function () {
  var curlyChanges = sinon.spy();
  var initialState = {
    ensemble: { waitingForPlayers: false },
    curly: { count: 0 }
  };
  function curlyCount (state) { return state.curly.count; }
  function curlyInputCallback (state) {
    return { curly: { count: state.for('curly').get('count') + 1 }};
  }
  function curlyLogic (delta, state) {
    return { curly: { count: state.for('curly').get('count') + 1000 }};
  }

  var onEachFrameSpy = sinon.spy();
  let next;

  before(() => {
    next = sinon.stub(sequence, 'next');
    for (let i = 0; i < 15; i++) {
      next.onCall(i).returns(i + 1);
    }

    each(onClientStart, callback => callback(initialState));
    each(onClientStart, callback => callback(initialState));

    actionMap.push(['*', { curly: [{call: curlyInputCallback} ] }]);
    onPhysicsFrame.push(curlyLogic);
    onPhysicsFrame.push(onEachFrameSpy);

    tracker.onChangeOf('curly.count', curlyChanges);
  });

  beforeEach(function () {
    onEachFrameSpy.reset();
    curlyChanges.reset();
  });

  after(() => {
    next.restore();
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

      expect(onEachFrameSpy.callCount).toEqual(2);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([2000, 1000, undefined]);

      expect(frameStore.current().id).toEqual(2);
    });

    it('should should remember 2 prior frames, process new frame', () => {
      expect(currentState.get(curlyCount)).toEqual(3000);
      expect(currentServerState.get(curlyCount)).toEqual(0);
      expect(rawStateAccess.get('client').curly.count).toEqual(3000);

      expect(onEachFrameSpy.callCount).toEqual(3);

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

      expect(onEachFrameSpy.callCount).toEqual(4);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([4001, 3000, undefined]);

      expect(frameStore.current().id).toEqual(4);
    });

    it('should not process the input twice', () => {
      expect(currentState.get(curlyCount)).toEqual(5001);
      expect(currentServerState.get(curlyCount)).toEqual(0);
      expect(rawStateAccess.get('client').curly.count).toEqual(5001);

      expect(onEachFrameSpy.callCount).toEqual(5);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([5001, 4001, undefined]);

      expect(frameStore.current().id).toEqual(5);
    });
  });

  describe('with new server state', () => {
    var laterState = {
      highestProcessedMessage: 3,
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

    it('should replay all frames since the server state', () => {
      expect(currentState.get(curlyCount)).toEqual(3101);
      expect(currentServerState.get(curlyCount)).toEqual(100);
      expect(rawStateAccess.get('client').curly.count).toEqual(3101);

      expect(onEachFrameSpy.callCount).toEqual(3);

      expect(curlyChanges.callCount).toEqual(1);
      expect(curlyChanges.firstCall.args).toEqual([3101, 5001, undefined]);

      expect(frameStore.current().id).toEqual(6);
    });
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