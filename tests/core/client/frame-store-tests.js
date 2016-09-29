import expect from 'expect';
import sinon from 'sinon';
import theGreatMutator from 'the-great-mutator/immutable';

const module = require('../../../src/core/client/frame-store');
const defer = require('../../support').defer;
const plugins = require('../../support').plugin();
const time = require('../../fake/time').at(2000);

const state = theGreatMutator({}, { trackChanges: false });

const playerId = 1;
const deviceNumber = 1;

const frameStore = module.func(
  defer({ resetTo: (newState) => state.set(newState), get: () => state }),
  defer({ set: sinon.spy(), clear: sinon.spy() }),
  defer(plugins.define),
  defer(time),
  defer('default'),
  defer(sinon.spy()),
  defer({ id: () => playerId }),
  defer({ number: () => deviceNumber })
);

const frameStorePlugins = plugins.deps();
const seed = frameStorePlugins.OnSeedInitialState();
const onIncomingServerPacket = frameStorePlugins.OnIncomingServerPacket();
const onOutgoingClientPacket = frameStorePlugins.OnOutgoingClientPacket();

describe('frame store', () => {
  describe('when server state updates arrive', () => {
    beforeEach(() => {
      frameStore.reset();
      seed({ literal: 'value' });
    });

    describe('dropping processed frames', () => {
      it('should drop frames equal to or below the highestProcessedMessage.frameId', () => {
        frameStore.process(0.16, () => undefined);
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { playerId: 1, deviceNumber: 1, frameId }
        ], changeDeltas: [] });

        expect(frameStore.current()).toEqual({
          id: 0,
          timestamp: null,
          input: null,
          cached: null
        });
      });

      it('should not drop frames above the highestProcessedMessage.frameId', () => {
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { playerId: 1, deviceNumber: 1, frameId: frameId - 1 }
        ], changeDeltas: [] });

        expect(frameStore.current().id).toEqual(frameId);
      });

      it('should not drop frames for other players', () => {
        frameStore.process(0.16, () => undefined);
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { playerId: 2, deviceNumber: 1, frameId }
        ], changeDeltas: [] });

        expect(frameStore.current().id).toEqual(frameId);
      });

      it('should not drop frames for other devices', () => {
        frameStore.process(0.16, () => undefined);
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { playerId: 1, deviceNumber: 2, frameId }
        ], changeDeltas: [] });

        expect(frameStore.current().id).toEqual(frameId);
      });

      it('should move input in dropped frames not processed by server into lowest frame', () => {
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 1, rawData: {} });
        frameStore.process(0.16, () => undefined);
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { frameId: frameId - 1, playerId: 1, deviceNumber: 1, packetId: 0 }
        ], changeDeltas: [] });

        expect(frameStore.current().input.map((i) => i.id)).toInclude(1);
      });

      it('should drop input in dropped frames processed by server', () => {
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 1, rawData: {} });
        frameStore.process(0.16, () => undefined);
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { frameId: frameId - 1, playerId: 1, deviceNumber: 1, packetId: 1 }
        ], changeDeltas: [] });

        expect(frameStore.current().input.map((i) => i.id)).toNotInclude(1);
      });

      it('should not drop input not processed by server and not in dropped frames', () => {
        frameStore.process(0.16, () => undefined);
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 1, rawData: {} });
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { frameId: frameId - 1, playerId: 1, deviceNumber: 1, packetId: 0 }
        ], changeDeltas: [] });

        expect(frameStore.current().input.map((i) => i.id)).toInclude(1);
      })

      it('should keep any input that cant be put on a frame into the input for next frame', () => {
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 1, rawData: {} });

        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { frameId, playerId: 1, deviceNumber: 1, packetId: 0}
        ], changeDeltas: [] });

        frameStore.process(0.16, () => undefined);

        expect(frameStore.current().input.map((i) => i.id)).toInclude(1);
      });

      it('should filter input by player', () => {
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 1, rawData: {} });
        onOutgoingClientPacket({ id: 1, playerId: 2, deviceNumber: 1, rawData: {} });
        frameStore.process(0.16, () => undefined);
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { frameId: frameId - 1, playerId: 1, deviceNumber: 1, packetId: 1 },
          { frameId: frameId - 1, playerId: 2, deviceNumber: 1, packetId: 0 }
        ], changeDeltas: [] });

        expect(frameStore.current().input.length).toEqual(1);
        expect(frameStore.current().input[0].id).toEqual(1);
        expect(frameStore.current().input[0].playerId).toEqual(2);
        expect(frameStore.current().input[0].deviceId).toEqual(1);
      });

      it('should filter input by device', () => {
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 1, rawData: {} });
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 2, rawData: {} });
        frameStore.process(0.16, () => undefined);
        frameStore.process(0.16, () => undefined);

        const frameId = frameStore.current().id;
        onIncomingServerPacket({ highestProcessedMessage: [
          { frameId: frameId - 1, playerId: 1, deviceNumber: 1, packetId: 1 },
          { frameId: frameId - 1, playerId: 1, deviceNumber: 2, packetId: 0 }
        ], changeDeltas: [] });

        expect(frameStore.current().input.length).toEqual(1);
        expect(frameStore.current().input[0].id).toEqual(1);
        expect(frameStore.current().input[0].playerId).toEqual(1);
        expect(frameStore.current().input[0].deviceId).toEqual(2);
      });

      it('should work when no data in highestProcessedMessage', () => {
        frameStore.process(0.16, () => undefined);
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 1, rawData: {} });
        onOutgoingClientPacket({ id: 1, playerId: 1, deviceNumber: 2, rawData: {} });
        frameStore.process(0.16, () => undefined);

        onIncomingServerPacket({ highestProcessedMessage: [], changeDeltas: [] });

        expect(frameStore.current().input.length).toEqual(2);

        let framesInStack = 0;
        frameStore.process(0.16, () => { framesInStack += 1 });

        expect(framesInStack).toEqual(3);
      });
    });
  });
});