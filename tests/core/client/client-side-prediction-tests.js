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

require('../../../src/state/client/tracker').func(defer(trackerPlugins.define));
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
onClientStart.push(trackerPluginsDeps.OnClientStart(defer(rawStateAccess)));
onIncomingServerPacket.push(trackerPluginsDeps.OnIncomingServerPacket(defer(rawStateAccess)));
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerPluginsDeps.AfterPhysicsFrame(defer(rawStateAccess)));

var clientState = {
  get: function () {return false;}
};

var serverState = {
  get: function () {return false;}
};


var frameStore = require('../../../src/core/client/frame-store').func(defer(rawStateAccess), defer(inputQueue), defer(frameStorePlugins.define), defer(fakeTime), defer('default'));
var frameStorePluginDeps = frameStorePlugins.deps();
onIncomingServerPacket.push(frameStorePluginDeps.OnIncomingServerPacket());
onOutgoingClientPacket.push(frameStorePluginDeps.OnOutgoingClientPacket());
onClientStart.push(frameStorePluginDeps.OnClientStart());

var startPhysicsEngine = require('../../../src/core/client/physics').func(defer(clientState), defer(serverState), defer(fakeTime), defer(beforePhysicsFrame), defer(onPhysicsFrame), defer(afterPhysicsFrame), defer(mutator), defer(stateAccess), defer(mode), defer(plugin('Config')), defer(frameStore));
var stopPhysicsEngine = plugin('OnDisconnect');

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
  let next;

  beforeEach(function () {
    next = sinon.stub(sequence, 'next');
    for (let i = 0; i < 5; i++) {
      next.onCall(i).returns(i + 1);
    }

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

  afterEach(() => {
    next.restore();
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