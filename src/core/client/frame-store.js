'use strict';

const { last } = require('lodash');
const sequence = require('distributedlife-sequence');
const Immutable = require('immutable');
const MemoryPool = require('memory-pool');

const PoolStartSize = 20;
const PoolGrowSize = 10;

module.exports = {
  type: 'FrameStore',
  deps: ['RawStateAccess', 'InputQueue', 'DefinePlugin', 'Time', 'DeviceMode', 'ApplyPendingMerges'],
  func: function FrameStore (rawState, queue, define, time, mode, applyPendingMerges) {
    let fromServer;
    let frames = [];
    let inputForNextFrame = [];

    function makeFrame () {
      return {
        id: null,
        Δ: null,
        timestamp: null,
        input: null,
        cached: null
      };
    }

    const pool = new MemoryPool(PoolStartSize, makeFrame, PoolGrowSize);

    function add (Δ) {
      let frame = pool.allocate();

      frame.id = sequence.next('frame');
      frame.Δ = Δ;
      frame.timestamp = time().present();
      frame.input = inputForNextFrame.splice(0);
      frame.cached = null;

      frames.push(frame);
    }

    const current = () => last(frames);

    function dropFrames (highestProcessedMessage) {
      const free = frames.filter(frame => frame.id <= highestProcessedMessage);
      free.forEach(frame => pool.free(frame));

      frames = frames.filter(frame => frame.id > highestProcessedMessage);
    }

    function resetCache () {
      frames.forEach(frame => (frame.cached = null));
    }

    function setLatestFromServer (state) {
      fromServer = Immutable.fromJS(state);
    }

    function OnClientStart () {
      return function storeInitialServerState (state) {
        setLatestFromServer(state);
      };
    }

    function OnIncomingServerPacket () {
      return function handle (packet) {
        setLatestFromServer(packet.saveState);
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
          timestamp: time().absolute(),
          save: {
            id: 'client',
            mode: mode()
          }
        });
      };
    }

    function process (Δ, runLogicOnFrame) {
      add(Δ);

      function processEachFrame (state, frame) {
        if (!frame.cached) {
          rawState().resetTo(state);

          queue().set(frame.input);
          runLogicOnFrame(frame.Δ, state);
          queue().clear();

          applyPendingMerges()();
          frame.cached = rawState().get();
        }

        return frame.cached;
      }

      frames.reduce(processEachFrame, fromServer);
    }

    function reset () {
      frames.forEach(frame => pool.free(frame));
      frames = [];
      fromServer = null;
      inputForNextFrame = [];
    }

    define()('OnClientStart', OnClientStart);
    define()('OnIncomingServerPacket', OnIncomingServerPacket);
    define()('OnOutgoingClientPacket', HandlePacketLocally);

    return { process, current, reset };
  }
};