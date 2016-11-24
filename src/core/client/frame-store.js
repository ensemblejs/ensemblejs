'use strict';

const { last } = require('lodash');
const sequence = require('distributedlife-sequence');
const MemoryPool = require('memory-pool');
import theGreatMutator from 'the-great-mutator/immutable';
import { wrap } from '../../util/breakdown-profiler';

const PoolStartSize = 50;
const PoolGrowSize = 10;
const NoFramesProcessed = { frameId: 0 };

module.exports = {
  type: 'FrameStore',
  deps: [
    'RawStateAccess', 'InputQueue', 'DefinePlugin', 'Time',
    'SaveMode', 'ApplyPendingMerges', 'Player', 'Device', 'DeviceMode'
  ],
  func: function FrameStore (
    rawState, queue, define, time, mode, applyPendingMerges, player, device, deviceMode
  ) {
    let fromServer;
    let frames = [];
    let inputForNextFrame = [];

    function makeFrame () {
      return {
        id: 0,
        timestamp: null,
        input: null,
        cached: null
      };
    }

    const pool = new MemoryPool(PoolStartSize, makeFrame, PoolGrowSize);

    function add () {
      const frame = pool.allocate();

      frame.id = sequence.next('frame');
      frame.timestamp = time().present();
      frame.input = inputForNextFrame.splice(0);
      frame.cached = null;

      frames.push(frame);
    }

    const current = () => last(frames) || makeFrame() ;

    function dropFrames (processedRecordsInfo) {
      const potentialInputToKeep = [];

      const highestForClient = processedRecordsInfo.find((hInput) => {
        return hInput.playerId === player().id() && hInput.deviceNumber === device().number()
      }) || NoFramesProcessed;

      const toBeProcessed = (frame) => frame.id > highestForClient.frameId;
      const haveBeenProcessed = (frame) => frame.id <= highestForClient.frameId;
      const inputNotProcessedByServer = (packet) => {
        const highestInputForPacket = processedRecordsInfo.find((hInput) => {
          return hInput.playerId === packet.playerId && hInput.deviceNumber === packet.deviceId
        });

        return highestInputForPacket ? packet.id > highestInputForPacket.packetId : true;
      }
      const removeInputInFrameProcessByServer = (frame) => ({
        ...frame,
        input: frame.input.filter(inputNotProcessedByServer)
      });

      const free = frames.filter(haveBeenProcessed);
      free.forEach((frame) => {
        potentialInputToKeep.push(...frame.input);
        pool.free(frame)
      });

      frames = frames
        .filter(toBeProcessed)
        .map(removeInputInFrameProcessByServer)

      const filteredInputToKeep = potentialInputToKeep.filter(inputNotProcessedByServer);

      if (frames.length > 0) {
        frames[0].input.push(...filteredInputToKeep);
      } else {
        inputForNextFrame.push(...filteredInputToKeep)
      }
    }

    function resetCache () {
      frames.forEach((frame) => (frame.cached = null));
    }

    function setLatestFromServer (state) {
      fromServer = theGreatMutator(state);
    }

    function applyLatestChangeDeltas (changeDeltas) {
      fromServer.mutateBatchSync(changeDeltas);
    }

    function OnSeedInitialState () {
      return function storeInitialServerState (state) {
        setLatestFromServer(state);
      };
    }

    function OnIncomingServerPacket () {
      return function handle (packet) {
        applyLatestChangeDeltas(packet.changeDeltas);
        dropFrames(packet.highestProcessedMessage);
        resetCache();
      };
    }

    function HandlePacketLocally () {
      return function putPacketOntoInputQueue (packet) {
        inputForNextFrame.push({
          id: packet.id,
          rawData: packet,
          playerId: packet.playerId,
          deviceId: packet.deviceNumber,
          timestamp: time().absolute(),
          save: {
            id: 'client',
            mode: mode()
          }
        });
      };
    }

    function process (Δ, runLogicOnFrame) {
      add();

      const processEachFrame = (state, frame) => {
        if (!frame.cached) {
          rawState().resetTo(state.all());

          queue().set(frame.input);
          runLogicOnFrame(Δ, state.all());
          queue().clear();

          applyPendingMerges()();

          frame.cached = rawState().get();
        }

        return frame.cached;
      }

      const wrappedProcessEachFrame = wrap(processEachFrame);

      frames.reduce(wrappedProcessEachFrame, fromServer);
    }

    function reset () {
      frames.forEach((frame) => pool.free(frame));
      frames = [];
      fromServer = null;
      inputForNextFrame = [];
    }

    define()('OnSeedInitialState', OnSeedInitialState);
    define()('OnIncomingServerPacket', OnIncomingServerPacket);
    define()('OnOutgoingClientPacket', HandlePacketLocally);
    define()('OnIncomingPeerPacket', HandlePacketLocally);

    return {
      process: wrap(process),
      current: wrap(current),
      reset: wrap(reset)
    };
  }
};