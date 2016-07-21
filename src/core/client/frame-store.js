'use strict';

const { last } = require('lodash');
const sequence = require('distributedlife-sequence');
const Immutable = require('immutable');
var MemoryPool = require('memory-pool');

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

    var framePool = new MemoryPool(20, makeFrame, 10);

    function add (Δ) {
      let frame = framePool.allocate();

      frame.id = sequence.next('frame');
      frame.Δ = Δ;
      frame.timestamp = time().present();
      frame.input = inputForNextFrame.splice(0);
      frame.cached = null;

      frames.push(frame);
    }

    function current () {
      return last(frames);
    }

    function dropFrames (highestProcessedMessage) {
      const free = frames.filter(frame => frame.id <= highestProcessedMessage);
      free.forEach(frame => frame.free());

      frames = frames.filter(frame => frame.id > highestProcessedMessage);
    }

    function resetCache () {
      for (let i = 0; i < frames.length; i += 1) {
        frames[i].cached = null;
      }
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