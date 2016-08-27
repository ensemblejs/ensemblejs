'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;
const numeral = require('numeral');

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

let sequence = require('distributedlife-sequence');

var defer = require('../../support').defer;
var requirePlugin = require('../../support').requirePlugin;
var trackerPlugins = require('../../support').plugin();
var processPendingInputPlugins = require('../../support').plugin();
var inputQueuePlugins = require('../../support').plugin();
var frameStorePlugins = require('../../support').plugin();

var onSeedInitialState = [];
var onOutgoingClientPacket = [];
var onIncomingServerPacket = [];
var beforePhysicsFrame = [];
var onPhysicsFrame = [];
var afterPhysicsFrame = [];
var actionMap = [];
var onInput, onConnect, onDisconnect, onError, onPause, onResume, onServerStart, onServerReady, onClientReady, onServerStop, onOutgoingServerPacket, onClientConnect, onClientDisconnect, onNewGame = [];
var dimensions = {};

var tracker = requirePlugin('state/client/tracker', {}, {
  '../src/': trackerPlugins.define
});
var mutator = require('../../../src/state/client/mutator').func(defer(logger));
var rawStateAccess = plugin('RawStateAccess');
var stateAccess = plugin('StateAccess');
const applyPendingMerges = plugin('AfterPhysicsFrame');
afterPhysicsFrame.push(applyPendingMerges);

var mode = 'default';
var inputQueue = require('../../../src/input/client/queue').func(defer(inputQueuePlugins.define), defer(mode), defer(fakeTime), defer(plugin('Config')));

require('../../../src/input/client/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
var processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame(defer(inputQueue));

var on = require('../../../src/events/shared/on').func(defer(mutator), defer(stateAccess), defer(onInput), defer(onConnect), defer(onDisconnect), defer(onIncomingServerPacket), defer(onSeedInitialState), defer(onError), defer(onOutgoingClientPacket), defer(onPause), defer(onResume), defer(onServerStart), defer(onServerReady), defer(onClientReady), defer(onServerStop), defer(onOutgoingServerPacket), defer(onClientConnect), defer(onClientDisconnect), defer(onNewGame), defer(dimensions));

var trackerPluginsDeps = trackerPlugins.deps();
var currentState = trackerPluginsDeps.CurrentState();
var currentServerState = trackerPluginsDeps.CurrentServerState();
onSeedInitialState.push(trackerPluginsDeps.OnSeedInitialState(defer(rawStateAccess)));
// onIncomingServerPacket.push(trackerPluginsDeps.OnIncomingServerPacket(defer(rawStateAccess)));
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerPluginsDeps.AfterPhysicsFrame(defer(rawStateAccess)));

var frameStore = require('../../../src/core/client/frame-store').func(defer(rawStateAccess), defer(inputQueue), defer(frameStorePlugins.define), defer(fakeTime), defer('default'), defer(applyPendingMerges));
var frameStorePluginDeps = frameStorePlugins.deps();
onIncomingServerPacket.push(frameStorePluginDeps.OnIncomingServerPacket());
onOutgoingClientPacket.push(frameStorePluginDeps.OnOutgoingClientPacket());
onSeedInitialState.push(frameStorePluginDeps.OnSeedInitialState());

describe.skip('the pacman problem', function () {
  const sequenceOfEvents = [
    {client:
      {id: 1, delta: 0, expected: {
        current: '208.00', raw: '208.00', server: '208.00', changes: []
      }}},
    {server:
      { highestProcessedMessage: 0, saveState: { v: {x: 208}, ensemble: { waitingForPlayers: false }}, expected: { server: '208.00' }}},
    {client:
      {id: 2, delta: 0.20908999997377395, expected: {
        current: '191.27', raw: '191.27', server: '208.00', changes: [[191.27280000209808, 208.0, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 0, saveState: { v: {x: 208}, ensemble: { waitingForPlayers: false }}, expected: { server: '208.00' }}},
    {client:
      {id: 3, delta: 0.16518500000238417, expected: {
        current: '178.06', raw: '178.06', server: '208.00', changes: [[178.05800000190735, 191.27280000209808, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 0, saveState: { v: {x: 205.68403079986572}, ensemble: { waitingForPlayers: false }}, expected: { server: '205.68' }}},
    {server:
      { highestProcessedMessage: 0, saveState: { v: {x: 205.68403079986572}, ensemble: { waitingForPlayers: false }}, expected: { server: '205.68' }}},
    {client:
      {id: 4, delta: 0.16459500002861022, expected: {
        current: '162.57', raw: '162.57', server: '205.68', changes: [[162.57443079948425, 178.05800000190735, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 0, saveState: { v: {x: 191.73009664058685}, ensemble: { waitingForPlayers: false }}, expected: { server: '191.73' }}},
    {client:
      {id: 5, delta: 0.14091500002145768, expected: {
        current: '137.35', raw: '137.35', server: '191.73', changes: [[137.34729663848876, 162.57443079948425, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 0, saveState: { v: {x: 191.73009664058685}, ensemble: { waitingForPlayers: false }}, expected: { server: '191.73' }}},
    {client:
      {id: 6, delta: 0.3724949999451637, expected: {
        current: '107.55', raw: '107.55', server: '191.73', changes: [[107.54769664287566, 137.34729663848876, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 0, saveState: { v: {x: 191.73009664058685}, ensemble: { waitingForPlayers: false }}, expected: { server: '191.73' }}},
    {server:
      { highestProcessedMessage: 0, saveState: { v: {x: 191.73009664058685}, ensemble: { waitingForPlayers: false}}, expected: { server: '191.73' }}},
    {client:
      {id: 7, delta: 0.34306500005722046, expected: {
        current: '80.10', raw: '80.10', server: '191.73', changes: [[80.10249663829802, 107.54769664287566, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 2, saveState: { v: {x: 179.7251378393173}, ensemble: { waitingForPlayers: false }}, expected: { server: '179.73' }}},
    {server:
      { highestProcessedMessage: 2, saveState: { v: {x: 179.7251378393173}, ensemble: { waitingForPlayers: false }}, expected: { server: '179.73' }}},
    {client:
      {id: 8, delta: 0.25871499997377395, expected: {
        current: '64.13', raw: '64.13', server: '179.73', changes: [[64.12753783702848, 80.10249663829802, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 3, saveState: { v: {x: 179.7251378393173}, ensemble: { waitingForPlayers: false }}, expected: { server: '179.73' }}},
    {server:
      { highestProcessedMessage: 3, saveState: { v: {x: 179.7251378393173}, ensemble: { waitingForPlayers: false }}, expected: { server: '179.73' }}},
    {client:
      {id: 9, delta: 0.18326999998092652, expected: {
        current: '62.68', raw: '62.68', server: '179.73', changes: [[62.680737838745095, 64.12753783702848, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 4, saveState: { v: {x: 168.06166808128356}, ensemble: { waitingForPlayers: false }}, expected: { server: '168.06' }}},
    {client:
      {id: 10, delta: 0.162125, expected: {
        current: '51.21', raw: '51.21', server: '168.06', changes: [[51.21486808300017, 62.680737838745095, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 4, saveState: { v: {x: 168.06166808128356}, ensemble: { waitingForPlayers: false }}, expected: { server: '168.06' }}},
    {client:
      {id: 11, delta: 0.15427500003576278, expected: {
        current: '38.87', raw: '38.87', server: '168.06', changes: [[38.87286808013915, 51.21486808300017, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 5, saveState: { v: {x: 168.06166808128356}, ensemble: { waitingForPlayers: false }}, expected: { server: '168.06' }}},
    {server:
      { highestProcessedMessage: 5, saveState: { v: {x: 168.06166808128356}, ensemble: { waitingForPlayers: false }}, expected: { server: '168.06' }}},
    {client:
      {id: 12, delta: 0.194125, expected: {
        current: '34.62', raw: '34.62', server: '168.06', changes: [[34.616068081855765, 38.87286808013915, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 5, saveState: { v: {x: 154.41450152397155}, ensemble: { waitingForPlayers: false }}, expected: { server: '154.41' }}},
    {client:
      {id: 13, delta: 0.17720999997854234, expected: {
        current: '6.79', raw: '6.79', server: '154.41', changes: [[6.792101526260366, 34.616068081855765, undefined]]
      }}},
    {server:
      { highestProcessedMessage: 5, saveState: { v: {x: 154.41450152397155}, ensemble: { waitingForPlayers: false }}, expected: { server: '154.41' }}}
  ];

  const vxChanges = sinon.spy();
  const initialState = {
    ensemble: { waitingForPlayers: false },
    v: {x: 208}
  };
  function vx (state) { return state.v.x; }
  function moveX (delta, state) {
    return ['v.x', state.v.x + (-80 * delta)];
  }

  let next;

  before(() => {
    next = sinon.stub(sequence, 'next');
    for (let i = 0; i < 15; i++) {
      next.onCall(i).returns(i + 1);
    }

    frameStore.reset();

    each(onSeedInitialState, callback => callback(initialState));

    onPhysicsFrame.push(moveX);

    tracker.onChangeOf('v.x', vxChanges);
  });

  after(() => {
    next.restore();
  });

  function processFrame (delta) {
    each(beforePhysicsFrame, f => {
      mutator('client', f(delta, stateAccess.for('client').all()));
    });
    each(onPhysicsFrame, f => {
      mutator('client', f(delta, stateAccess.for('client').all()));
    });
  }

  each(sequenceOfEvents, event => {
    if (event.client) {
      describe(`processing client frame ${event.client.id}`, () => {

        const expected = event.client.expected;

        before(() => {
          const delta = event.client.delta;

          frameStore.process(delta, processFrame);

          vxChanges.reset();
          each(afterPhysicsFrame, f => f(delta, stateAccess.for('client').all()));
        });

        it('should have the correct client state', () => {
          const csActual = numeral(currentState.get(vx)).format('0.00');

          const rawActual = numeral(rawStateAccess.get('client').get('v').get('x')).format('0.00');

          expect(csActual).toEqual(expected.current);
          expect(rawActual).toEqual(expected.raw);
        });

        it('should not change the current server state', () => {
          const sActual = numeral(currentServerState.get(vx)).format('0.00');

          expect(sActual).toEqual(expected.server);
        });

        it('should emit state change events', () => {
          expect(vxChanges.callCount).toEqual(expected.changes.length);

          expected.changes.forEach((change, i) => {
            expect(vxChanges.getCall(i).args).toEqual(change);
          });
        });

        it('should have the correct frame count', () => {
          expect(frameStore.current().id).toEqual(event.client.id);
        });
      });
    }

    if (event.server) {
      const expected = event.server.expected;

      describe('processing server event', () => {
        before(() => {
          on.incomingServerPacket(event.server);
        });

        it('should update the current server state', () => {
          const sActual = numeral(currentServerState.get(vx)).format('0.00');
          expect(sActual).toEqual(expected.server);
        });
      });
    }
  });
});