'use strict';

var expect = require('expect');
var sinon = require('sinon');
var each = require('lodash').each;

var defer = require('../../support').defer;
var trackerPlugins = require('../../support').plugin();
var mutatorPlugins = require('../../support').plugin();
var processPendingInputPlugins = require('../../support').plugin();
var inputQueuePlugins = require('../../support').plugin();
var logger = require('../../support').logger;

var onSetup = [];
var onClientPacket = [];
var onServerPacket = [];
var onPhysicsFrame = [];
var onPhysicsFrameComplete = [];
var actionMap = [];
var empty = [];

require('../../../src/state/client/tracker').func(defer(trackerPlugins.define));
var mutator = require('../../../src/state/client/mutator').func(defer(mutatorPlugins.define));
var rawStateAccess = mutatorPlugins.deps().RawStateAccess();
var stateAccess = mutatorPlugins.deps().StateAccess();

var mode = 'game';
var inputQueue = require('../../../src/input/client/queue').func(defer(inputQueuePlugins.define), defer(mode));

require('../../../src/input/client/process_pending_input').func(defer(actionMap), defer(processPendingInputPlugins.define), defer(mutator), defer(logger));
var processPendingInput = processPendingInputPlugins.deps().OnPhysicsFrame(defer(inputQueue));

var on = require('../../../src/events/shared/on').func(defer(mutator), defer(stateAccess), defer(empty), defer(empty), defer(empty), defer(onServerPacket), defer(onSetup), defer(empty), defer(empty), defer(empty), defer(onPhysicsFrame), defer(onPhysicsFrameComplete), defer(onClientPacket));

var resetTo = sinon.spy(rawStateAccess, 'resetTo');
var currentState = trackerPlugins.deps().CurrentState();
onSetup.push(trackerPlugins.deps().OnSetup(defer(rawStateAccess)));
onClientPacket.push(inputQueuePlugins.deps().OnClientPacket());
onServerPacket.push(trackerPlugins.deps().OnServerPacket());
onServerPacket.push(inputQueuePlugins.deps().OnServerPacket());
onPhysicsFrame.push(['*', processPendingInput]);
onPhysicsFrameComplete.push(trackerPlugins.deps().OnPhysicsFrameComplete(defer(rawStateAccess)));
onPhysicsFrameComplete.push(inputQueuePlugins.deps().OnPhysicsFrameComplete());

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

describe('after on OnPhysicsFrameComplete', function () {
  beforeEach(function () {
    var initialState = {
      namespace: {
        count: 0,
        tracking: 'initial-server-state'
      }
    };

    each(onSetup, function (callback) {
      callback(initialState);
    });
  });

  describe('when no input or logic', function () {
    beforeEach(function () {
      on.physicsFrame();
    });

    it('should use the last server state as the client state', function () {
      expect(currentState.get(tracking)).toEqual('initial-server-state');
    });

    it('should reset the RawState back to last known server state', function () {
      expect(resetTo.firstCall.args).toEqual([{
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
      on.physicsFrame();
    });

    afterEach(function () {
      onPhysicsFrame.pop();
    });

    it('should apply the changes of the game logic to the last known server state', function () {
      expect(currentState.get(tracking)).toEqual('after-game-logic');
      expect(currentState.get(count)).toEqual(1);
    });

    it('when run twice it should result in the same client state', function () {
      on.physicsFrame();

      expect(currentState.get(tracking)).toEqual('after-game-logic');
      expect(currentState.get(count)).toEqual(1);
    });
  });

  describe('when user input exists', function () {
    beforeEach(function () {
      on.clientPacket({
        id: 1,
        keys: [{key: 'space'}]
      });

      on.physicsFrame();
    });

    it('should process input on top of last known server state', function () {
      expect(currentState.get(tracking)).toEqual('after-input');
      expect(currentState.get(count)).toEqual(10);
    });

    it('when run twice it should result in same client state', function () {
      on.physicsFrame();

      expect(currentState.get(tracking)).toEqual('after-input');
      expect(currentState.get(count)).toEqual(10);
    });
  });

  describe('when new server state comes', function () {
    var laterState = {
      highestProcessedMessage: 1,
      gameState: {
        namespace: {
          count: 20,
          tracking: 'after-new-packet'
        }
      }
    };

    beforeEach(function () {
      on.serverPacket(laterState);

      on.physicsFrame();
    });

    it('should defer new server states until the end of the next physics frame', function () {
      expect(currentState.get(tracking)).toNotEqual('after-new-packet');

      on.physicsFrame();
      expect(currentState.get(tracking)).toEqual('after-new-packet');
    });

    it('should remove input now processed by the server', function () {
      on.clientPacket({
        id: 2,
        keys: [{key: 'space'}]
      });

      on.physicsFrame();

      expect(currentState.get(tracking)).toEqual('after-input');
      expect(currentState.get(count)).toEqual(30);
    });
  });
});