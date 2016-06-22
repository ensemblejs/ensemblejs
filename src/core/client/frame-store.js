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
        post: null
      });
    }

    function current () {
      return last(frames);
    }

    function dropFrames (highestProcessedMessage) {
      frames = frames.filter(frame => frame.id > highestProcessedMessage);
    }

    function resetCache () {
      frames = frames.map(frame => {
        frame.post = null;
        return frame;
      });
      // frames.forEach(frame => {
      //   frame.post = null;
      // });
    }

    function OnClientStart () {
      return function storeInitialServerState (state) {
        fromServer = Immutable.fromJS(state);
      };
    }

    function OnIncomingServerPacket () {
      return function handle (packet) {
        fromServer = Immutable.fromJS(packet.saveState);
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

      function processFrame (state, frame) {
        if (!frame.post) {
          rawState().resetTo(state);

          queue().set(frame.input);
          runLogicOnFrame(frame.Δ);
          queue().clear();

          frame.post = rawState().get();
        }

        return frame.post;
      }

      frames.reduce(processFrame, fromServer);
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