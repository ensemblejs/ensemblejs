'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;

var defer = require('../../support').defer;
var trackerPlugins = require('../../support').plugin();
var mutatorPlugins = require('../../support').plugin();
var processPendingInputPlugins = require('../../support').plugin();
var physicsEnginePlugins = require('../../support').plugin();
var inputQueuePlugins = require('../../support').plugin();
var fakeTime = require('../../fake/time').at(2000);
var logger = require('../../fake/logger');
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

require('../../../src/state/client/tracker').func(defer(trackerPlugins.define));
var mutator = require('../../../src/state/client/mutator').func(defer(mutatorPlugins.define));
var rawStateAccess = mutatorPlugins.deps().RawStateAccess();
var stateAccess = mutatorPlugins.deps().StateAccess();

var mode = 'game';
var inputQueue = require('../../../src/input/client/queue').func(defer(inputQueuePlugins.define), defer(mode), defer(fakeTime));

require('../../../src/input/client/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
var processPendingInput = processPendingInputPlugins.deps().BeforePhysicsFrame(defer(inputQueue));

var on = require('../../../src/events/shared/on').func(defer(mutator), defer(stateAccess), defer(onInput), defer(onConnect), defer(onDisconnect), defer(onIncomingServerPacket), defer(onClientStart), defer(onError), defer(onOutgoingClientPacket), defer(onPause), defer(onResume), defer(onServerStart), defer(onServerReady), defer(onClientReady), defer(onServerStop), defer(onOutgoingServerPacket), defer(onClientConnect), defer(onClientDisconnect), defer(onNewGame), defer(dimensions));

var resetTo = sinon.spy(rawStateAccess, 'resetTo');
var currentState = trackerPlugins.deps().CurrentState();
onClientStart.push(trackerPlugins.deps().OnClientStart(defer(rawStateAccess)));
onOutgoingClientPacket.push(inputQueuePlugins.deps().OnOutgoingClientPacket());
onIncomingServerPacket.push(trackerPlugins.deps().OnIncomingServerPacket());
onIncomingServerPacket.push(inputQueuePlugins.deps().OnIncomingServerPacket());
beforePhysicsFrame.push(processPendingInput);
afterPhysicsFrame.push(trackerPlugins.deps().AfterPhysicsFrame(defer(rawStateAccess)));
afterPhysicsFrame.push(inputQueuePlugins.deps().AfterPhysicsFrame());

var clientState = {
  get: function () {return false;}
};

var serverState = {
  get: function () {return false;}
};

var config = {
  client: {
    clientSidePrediction: true,
    physicsUpdateLoop: 15
  }
};

var startPhysicsEngine = require('../../../src/core/client/physics').func(defer(clientState), defer(serverState), defer(physicsEnginePlugins.define), defer(fakeTime), defer(beforePhysicsFrame), defer(onPhysicsFrame), defer(afterPhysicsFrame), defer(mutator), defer(stateAccess), defer(mode), defer(config), defer(profiler));
var stopPhysicsEngine = physicsEnginePlugins.deps().OnDisconnect();

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
actionMap.push(['*', { space: [{target: inputCallback} ] }]);

function gameLogic (state) {
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

      it('should not run if the game', function () {
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
      gameState: {
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
      stopPhysicsEngine();

      expect(currentState.get(tracking)).toEqual('after-input');
      expect(currentState.get(count)).toEqual(30);
    });
  });
});