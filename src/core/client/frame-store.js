'use strict';

const { last } = require('lodash');
const sequence = require('distributedlife-sequence');
const Immutable = require('immutable');

module.exports = {
  type: 'FrameStore',
  deps: ['RawStateAccess', 'InputQueue', 'DefinePlugin', 'Time', 'DeviceMode'],
  func: function FrameStore (rawState, queue, define, time, mode) {
    let fromServer;
    let frames = [];
    let inputForNextFrame = [];

    function add (Δ) {
      frames.push({
        id: sequence.next('frame'),
        Δ,
        timestamp: time().present(),
        input: inputForNextFrame.splice(0),
        cached: null
      });
    }

    function current () {
      return last(frames);
    }

    function dropFrames (highestProcessedMessage) {
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
          runLogicOnFrame(frame.Δ);
          queue().clear();

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