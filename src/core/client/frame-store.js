'use strict';

const { each, reject, last, map } = require('lodash');
const sequence = require('distributedlife-sequence');
const { clone } = require('../../util/fast-clone');

module.exports = {
  type: 'FrameStore',
  deps: ['RawStateAccess', 'InputQueue', 'DefinePlugin', 'Time'],
  func: function FrameStore (rawState, queue, define, time) {
    let fromServer;
    let frames = [];
    let inputForNextFrame = [];

    function add (delta) {
      frames.push({
        id: sequence.next('frame'),
        delta,
        timestamp: time().present(),
        input: inputForNextFrame,
        pre: null,
        post: null
      });

      inputForNextFrame = [];
    }

    function current () {
      return last(frames);
    }

    function dropFrames (highestProcessedMessage) {
      frames = reject(frames, frame => frame.id <= highestProcessedMessage);
    }

    function resetPreAndPost () {
      frames = map(frames, frame => {
        frame.pre = null;
        frame.post = null;
        return frame;
      });
    }

    function OnClientStart () {
      return function storeInitialServerState (state) {
        fromServer = state;
      };
    }

    function OnIncomingServerPacket () {
      return function handle (packet) {
        fromServer = clone(packet.saveState);
        dropFrames(packet.highestProcessedMessage);
        resetPreAndPost();
      };
    }

    function HandlePacketLocally () {
      return function putPacketOntoInputQueue (packet) {
        inputForNextFrame.push({
          id: packet.id,
          rawData: packet,
          playerId: packet.playerId,
          // timestamp: time().present(), absolute or relative to start?
          save: {
            id: 'client',
            mode: 'default' // TODO: mode()
          }
        });
      };
    }

    function process (delta, runLogicOnFrame) {
      add(delta);

      let state = fromServer;

      each(frames, frame => {
        rawState().resetTo(clone(state));

        queue().set(frame.input);

        runLogicOnFrame(frame.delta);

        queue().clear();

        state = clone(rawState().get());
      });
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